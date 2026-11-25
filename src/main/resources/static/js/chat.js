$(function() {
    const maxMessageLength = 255;
    let refreshInterval;
    let sessionVersion = 0;
    let signedIn = false;
    let sending = false;
    let changingPassword = false;
    const messagePageSize = 50;
    const maxVisibleMessages = 300;
    let messages = [];
    let historyLoaded = false;
    let hasOlderMessages = false;
    let hasNewerMessages = false;
    let previousUsers = '';
    let messageRequest;
    let userRequest;
    let scrollAfterSend = false;
    let chatErrors = {};
    let timeFormat = new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit'});
    let dateFormat = new Intl.DateTimeFormat(undefined, {month: 'long', day: 'numeric', year: 'numeric'});
    let messageList = $('.messages-list')[0];
    let messageInput = $('#messageInput')[0];
    let passwordDialog = $('#passwordDialog')[0];

    let getCsrfToken = function() {
        let cookie = document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN='));
        return cookie ? decodeURIComponent(cookie.substring('XSRF-TOKEN='.length)) : '';
    };

    let post = function(url, data) {
        let send = function() {
            return $.ajax({
                url: url,
                method: 'POST',
                data: data,
                headers: {'X-XSRF-TOKEN': getCsrfToken()}
            });
        };
        return getCsrfToken() ? send() : $.get('/init').then(send);
    };

    let showChatError = function(source, message) {
        chatErrors[source] = message;
        $('#chatMessage').text(Object.values(chatErrors).find(value => value) || '');
    };

    let resizeComposer = function() {
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
        let length = Array.from(messageInput.value).length;
        let tooLong = length > maxMessageLength;
        $('#messageLength').text(length + ' / ' + maxMessageLength + ' characters').toggleClass('is-invalid', tooLong);
        $('#messageInput').attr('aria-invalid', String(tooLong));
        if (!tooLong) {
            $('#messageToast').prop('hidden', true);
        }
        $('.send-message').prop('disabled', sending || !messageInput.value.trim());
    };

    let closeParticipants = function(returnFocus) {
        $('#participantsPanel').removeClass('is-open');
        $('#participantsToggle').attr('aria-expanded', 'false');
        if (returnFocus) {
            $('#participantsToggle').trigger('focus');
        }
    };

    let resetPassword = function() {
        $('#loginPassword').val('').attr('type', 'password');
        $('#passwordToggle').text('Show').attr({'aria-pressed': 'false', 'aria-label': 'Show password'});
    };

    let showLogin = function(message) {
        signedIn = false;
        passwordDialog.close();
        sessionVersion++;
        clearInterval(refreshInterval);
        messageRequest?.abort();
        userRequest?.abort();
        $('.app-loading').prop('hidden', true);
        $('.chat-shell').prop('hidden', true);
        $('.authentication').prop('hidden', false);
        $('body').removeClass('is-chat');
        $('.messages-list, .users-list').empty();
        $('#messageToast').prop('hidden', true);
        messageInput.value = '';
        resetPassword();
        chatErrors = {};
        $('#chatMessage').text('');
        $('#authMessage').text(message || '');
        closeParticipants(false);
        if (message) {
            $('#loginName').trigger('focus');
        }
    };

    let handleChatError = function(response, version, source) {
        if (version !== sessionVersion || !signedIn || response.statusText === 'abort') {
            return;
        }
        if (response.status === 401 || response.status === 403) {
            showLogin('Your session has expired. Please sign in again.');
        } else {
            showChatError(source, source === 'send'
                ? 'Unable to send your message. Your draft is saved here; please try again.'
                : 'Unable to refresh the chat. Reconnecting…');
        }
    };

    let getAvatar = function(name) {
        let words = (name || '?').trim().split(/\s+/);
        let initials = Array.from(words[0])[0] || '?';
        if (words.length > 1) {
            initials += Array.from(words[words.length - 1])[0] || '';
        }
        let color = Array.from(name || '').reduce((value, character) => (value * 31 + character.codePointAt(0)) >>> 0, 0) % 5;
        return $('<span class="avatar" aria-hidden="true"></span>').attr('data-color', color).text(initials.toLocaleUpperCase());
    };

    let getDateLabel = function(value) {
        let date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return 'Conversation';
        }
        let today = new Date();
        let yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        }
        return date.toDateString() === yesterday.toDateString() ? 'Yesterday' : dateFormat.format(date);
    };

    let getMessageElement = function(message) {
        let item = $('<div class="message-item"></div>').attr('data-message-id', message.id);
        let content = $('<div class="message-content"></div>');
        let header = $('<div class="message-header"></div>');
        let date = new Date(message.dateTime);
        let timestamp = $('<time class="dateTime"></time>');
        if (!Number.isNaN(date.getTime())) {
            timestamp.attr({datetime: message.dateTime, title: dateFormat.format(date) + ', ' + timeFormat.format(date)}).text(timeFormat.format(date));
        }
        header.append($('<span class="userName"></span>').text(message.userName), timestamp);
        content.append(header, $('<div class="message-text"></div>').text(message.text));
        item.append(getAvatar(message.userName), content);
        return item;
    };

    let scrollToLatest = function() {
        messageList.scrollTop = messageList.scrollHeight;
        $('#latestButton').prop('hidden', true);
    };

    let updateUsers = function(version) {
        if (userRequest?.state() === 'pending') {
            return;
        }
        userRequest = $.get('/user').done(function(users) {
            if (version !== sessionVersion || !signedIn) {
                return;
            }
            showChatError('users', '');
            let snapshot = JSON.stringify(users);
            if (snapshot === previousUsers) {
                return;
            }
            previousUsers = snapshot;
            $('.participant-count').text(users.length);
            $('.users-list').empty();
            for (let user of users) {
                let item = $('<div class="user-item" role="listitem"></div>');
                item.append(getAvatar(user.name), $('<span class="name"></span>').text(user.name));
                $('.users-list').append(item);
            }
        }).fail(function(response) {
            handleChatError(response, version, 'users');
        });
    };

    let renderMessages = function() {
        $('.messages-list').empty();
        if (hasOlderMessages) {
            $('.messages-list').append($('<button class="keycap secondary-button history-button" type="button">Load older messages</button>'));
        }
        if (messages.length === 0) {
            $('.messages-list').append($('<div class="empty-state"></div>').append(
                $('<span class="empty-symbol" aria-hidden="true">✳</span>'),
                $('<h2>Every conversation starts somewhere.</h2>'),
                $('<p>Say hello, share a thought, or simply break the ice.</p>')
            ));
        }
        let lastDay = '';
        for (let message of messages) {
            let day = getDateLabel(message.dateTime);
            if (day !== lastDay) {
                $('.messages-list').append($('<div class="date-divider"></div>').text(day));
                lastDay = day;
            }
            $('.messages-list').append(getMessageElement(message));
        }
    };

    let loadMessages = function(version, direction) {
        if (!signedIn || messageRequest?.state() === 'pending') {
            return;
        }
        if (direction === 'older' && (!historyLoaded || !hasOlderMessages)) {
            return;
        }
        let initial = !historyLoaded || direction === 'latest';
        let parameters = initial ? {} : direction === 'older'
            ? {before: messages[0].id} : {after: messages.at(-1)?.id || 0};
        $('.messages-list').attr('aria-busy', 'true');
        $('.history-button').prop('disabled', true).text('Loading…');
        let followLatest = false;
        messageRequest = $.get('/message', parameters).done(function(page) {
            if (version !== sessionVersion || !signedIn) {
                return;
            }
            showChatError('messages', '');
            let atBottom = messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 80;
            let shouldScroll = initial || (direction !== 'older' && (atBottom || scrollAfterSend));
            let bounds = messageList.getBoundingClientRect();
            let anchor = Array.from(messageList.querySelectorAll('.message-item'))
                .find(item => item.getBoundingClientRect().bottom > bounds.top);
            let anchorId = anchor?.dataset.messageId;
            let anchorTop = anchor?.getBoundingClientRect().top;
            let previousTop = messageList.scrollTop;
            let knownIds = new Set(messages.map(message => message.id));
            let additions = page.filter(message => !knownIds.has(message.id));
            if (initial) {
                messages = page;
                hasOlderMessages = page.length === messagePageSize;
                hasNewerMessages = false;
            } else if (direction === 'older') {
                messages = additions.concat(messages);
                hasOlderMessages = page.length === messagePageSize;
                if (messages.length > maxVisibleMessages) {
                    messages = messages.slice(0, maxVisibleMessages);
                    hasNewerMessages = true;
                }
            } else {
                messages = messages.concat(additions);
                hasNewerMessages = page.length === messagePageSize;
                if (messages.length > maxVisibleMessages) {
                    messages = messages.slice(-maxVisibleMessages);
                    hasOlderMessages = true;
                }
            }
            historyLoaded = true;
            if (initial || direction === 'older' || additions.length > 0) {
                renderMessages();
            }
            if (shouldScroll) {
                scrollToLatest();
            } else if (anchorId) {
                let restored = messageList.querySelector('[data-message-id="' + anchorId + '"]');
                messageList.scrollTop = restored
                    ? messageList.scrollTop + restored.getBoundingClientRect().top - anchorTop : previousTop;
            }
            if (hasNewerMessages || (!shouldScroll && direction !== 'older' && additions.length > 0)) {
                $('#latestButton').text(hasNewerMessages ? 'Back to latest' : 'New messages').prop('hidden', false);
            }
            scrollAfterSend = false;
            followLatest = hasNewerMessages && shouldScroll;
        }).fail(function(response) {
            handleChatError(response, version, 'messages');
        }).always(function() {
            if (version !== sessionVersion || !signedIn) {
                return;
            }
            $('.messages-list').attr('aria-busy', 'false');
            $('.history-button').prop('disabled', false).text('Load older messages');
            if (followLatest) {
                setTimeout(function() {
                    if (version === sessionVersion && signedIn) {
                        loadMessages(version, 'newer');
                    }
                }, 0);
            }
        });
    };

    let updateMessages = function(version) {
        let readingHistory = messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight >= 80;
        if (!scrollAfterSend && messages.length > maxVisibleMessages - messagePageSize && readingHistory) {
            hasNewerMessages = true;
            $('#latestButton').text('Back to latest').prop('hidden', false);
            return;
        }
        if (scrollAfterSend && hasNewerMessages) {
            loadMessages(version, 'latest');
        } else if (!hasNewerMessages) {
            loadMessages(version, 'newer');
        }
    };

    let initApplication = function() {
        clearInterval(refreshInterval);
        let version = ++sessionVersion;
        signedIn = true;
        sending = false;
        $('.send-message').text('Send message').append($('<kbd aria-hidden="true">↵</kbd>'));
        messages = [];
        historyLoaded = false;
        hasOlderMessages = false;
        hasNewerMessages = false;
        previousUsers = '';
        scrollAfterSend = false;
        resetPassword();
        $('.app-loading, .authentication').prop('hidden', true);
        $('.chat-shell').prop('hidden', false);
        $('body').addClass('is-chat');
        $('.messages-list').attr('aria-busy', 'true').empty().append(
            $('<div class="empty-state"><p>Loading the conversation…</p></div>')
        );
        $('#latestButton').prop('hidden', true);
        chatErrors = {};
        $('#chatMessage').text('');
        resizeComposer();
        $('#chatTitle').trigger('focus');
        let refresh = function() {
            updateUsers(version);
            updateMessages(version);
        };
        refresh();
        refreshInterval = setInterval(refresh, 2000);
    };

    $('#passwordToggle').on('click', function() {
        let show = $('#loginPassword').attr('type') === 'password';
        $('#loginPassword').attr('type', show ? 'text' : 'password');
        $(this).text(show ? 'Hide' : 'Show').attr({'aria-pressed': String(show), 'aria-label': show ? 'Hide password' : 'Show password'});
    });

    $('#loginForm').on('submit', function(event) {
        event.preventDefault();
        let buttons = $('#loginForm button').prop('disabled', true);
        $('.join-button > span').text('Joining…');
        $('#authMessage').text('');
        post('/auth', {name: $('#loginName').val().trim(), password: $('#loginPassword').val()})
            .then(function() {
                return $.get('/init');
            })
            .done(function(response) {
                if (response.result) {
                    initApplication();
                } else {
                    showLogin('Unable to sign in. Please try again.');
                }
            })
            .fail(function(response) {
                resetPassword();
                $('#authMessage').text(response.status === 401
                    ? 'Check your name and password. Use your personal password if you changed it.' : response.status === 503
                        ? 'The chat database is unavailable. Please try signing in again shortly.'
                        : 'Unable to sign in. Please try again.');
                $('#loginPassword').trigger('focus');
            }).always(function() {
                buttons.prop('disabled', false);
                $('.join-button > span').text('Join the conversation');
            });
    });

    $('#changePasswordButton').on('click', function() {
        $('#changePasswordForm')[0].reset();
        $('#passwordMessage').text('');
        passwordDialog.showModal();
        $('#currentPassword').trigger('focus');
    });
    $('#cancelPasswordChange').on('click', function() {
        passwordDialog.close();
    });
    $(passwordDialog).on('cancel', function(event) {
        if (changingPassword) {
            event.preventDefault();
        }
    }).on('close', function() {
        $('#changePasswordForm')[0].reset();
        $('#passwordMessage').text('');
    });
    $('#changePasswordForm').on('submit', function(event) {
        event.preventDefault();
        if (changingPassword || !signedIn) {
            return;
        }
        let newPassword = $('#newPassword').val();
        if (!newPassword.trim() || newPassword.length < 12 || new TextEncoder().encode(newPassword).length > 72) {
            $('#passwordMessage').text('Use at least 12 characters and no more than 72 UTF-8 bytes.');
            return;
        }
        if (newPassword !== $('#confirmPassword').val()) {
            $('#passwordMessage').text('The new passwords do not match.');
            return;
        }
        let version = sessionVersion;
        changingPassword = true;
        clearInterval(refreshInterval);
        messageRequest?.abort();
        userRequest?.abort();
        $('#passwordMessage').text('');
        $('#changePasswordForm button').prop('disabled', true);
        post('/password', {currentPassword: $('#currentPassword').val(), newPassword: newPassword})
            .done(function() {
                post('/logout').always(function() {
                    if (version === sessionVersion) {
                        showLogin('Password changed. Sign in with your name and new password.');
                    }
                });
            }).fail(function(response) {
                if (version !== sessionVersion || !signedIn) {
                    return;
                }
                if (response.status === 401 || response.status === 403) {
                    showLogin('Your session has expired. Please sign in again.');
                    return;
                }
                $('#passwordMessage').text(response.status === 400 ? 'The current password is incorrect.'
                    : response.status === 422 ? 'Use at least 12 characters and no more than 72 UTF-8 bytes.'
                    : response.status === 409 ? 'Your password was changed in another session. Please sign in again.'
                    : 'Unable to change your password. Please try again.');
                refreshInterval = setInterval(function() {
                    updateUsers(version);
                    updateMessages(version);
                }, 2000);
            }).always(function() {
                changingPassword = false;
                $('#changePasswordForm button').prop('disabled', false);
            });
    });

    $('#logoutButton').on('click', function() {
        let button = $(this).prop('disabled', true);
        let version = sessionVersion;
        post('/logout').done(function() {
            showLogin('You have signed out.');
        }).fail(function(response) {
            handleChatError(response, version, 'logout');
        }).always(function() {
            button.prop('disabled', false);
        });
    });

    $('#messageForm').on('submit', function(event) {
        event.preventDefault();
        let message = messageInput.value;
        if (!signedIn || sending || !message.trim()) {
            return;
        }
        let length = Array.from(message).length;
        if (length > maxMessageLength) {
            $('#messageToast').prop('hidden', false);
            $('#messageToastText').text('Use up to ' + maxMessageLength + ' characters. Your message has ' + length + '. Shorten it and try again.');
            messageInput.focus({preventScroll: true});
            return;
        }
        let version = sessionVersion;
        sending = true;
        $('.send-message').prop('disabled', true).text('Sending…');
        showChatError('send', '');
        post('/message', {message: message}).done(function(response) {
            if (version !== sessionVersion || !signedIn) {
                return;
            }
            if (response.result) {
                if (messageInput.value === message) {
                    messageInput.value = '';
                }
                scrollAfterSend = true;
                updateMessages(version);
            } else {
                showChatError('send', 'The message could not be sent. Please try again.');
            }
        }).fail(function(response) {
            handleChatError(response, version, 'send');
        }).always(function() {
            if (version === sessionVersion) {
                sending = false;
                $('.send-message').text('Send message').append($('<kbd aria-hidden="true">↵</kbd>'));
                resizeComposer();
            }
        });
    });

    $('#messageInput').on('input', resizeComposer).on('keydown', function(event) {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.originalEvent.isComposing) {
            event.preventDefault();
            $('#messageForm').trigger('submit');
        }
    });
    $('#latestButton').on('click', function() {
        if (hasNewerMessages) {
            loadMessages(sessionVersion, 'latest');
        } else {
            scrollToLatest();
        }
    });
    $('.messages-list').on('click', '.history-button', function() {
        loadMessages(sessionVersion, 'older');
    });
    $('#closeMessageToast').on('click', function() {
        $('#messageToast').prop('hidden', true);
        messageInput.focus({preventScroll: true});
    });
    $('.messages-list').on('scroll', function() {
        if (messageList.scrollTop < 80 && historyLoaded && hasOlderMessages) {
            loadMessages(sessionVersion, 'older');
        } else if (messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 80) {
            if (hasNewerMessages) {
                loadMessages(sessionVersion, 'newer');
            } else {
                $('#latestButton').prop('hidden', true);
            }
        }
    });
    $('#participantsToggle').on('click', function() {
        let open = $(this).attr('aria-expanded') !== 'true';
        $(this).attr('aria-expanded', String(open));
        $('#participantsPanel').toggleClass('is-open', open);
        if (open) {
            $('#participantsClose').trigger('focus');
        }
    });
    $('#participantsClose').on('click', () => closeParticipants(true));
    $(document).on('keydown', function(event) {
        if (event.key === 'Escape' && $('#participantsPanel').hasClass('is-open')) {
            closeParticipants(true);
        }
    }).on('click', function(event) {
        if (!$(event.target).closest('#participantsPanel, #participantsToggle').length) {
            closeParticipants(false);
        }
    });
    if (/Mac|iPhone|iPad/.test(navigator.platform)) {
        $('#sendShortcut').text('⌘ + Enter');
    }
    new ResizeObserver(function(entries) {
        document.documentElement.style.setProperty('--app-header-height', entries[0].target.offsetHeight + 'px');
    }).observe($('.app-header')[0]);

    $.get('/init').done(function(response) {
        if (response.result) {
            initApplication();
        } else {
            showLogin();
        }
    }).fail(function() {
        showLogin('Unable to connect. Please try signing in again.');
    });
});
