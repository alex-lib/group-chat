$(function() {
    let refreshInterval;
    let sessionVersion = 0;
    let signedIn = false;

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

    let showLogin = function(message) {
        signedIn = false;
        sessionVersion++;
        clearInterval(refreshInterval);
        $('.messages-and-users, .controls, .account-controls').hide();
        $('.messages-list, .users-list').empty();
        $('.new-message, input[type="password"]').val('');
        $('#chatMessage').text('');
        $('.authentication').show();
        $('#registerForm').prop('hidden', true);
        $('#loginForm').prop('hidden', false);
        $('#authMessage').text(message || '');
    };

    let handleChatError = function(response, version) {
        if (version !== sessionVersion || !signedIn) {
            return;
        }
        if (response.status === 401 || response.status === 403) {
            showLogin('Your session has expired. Please sign in again.');
        } else {
            $('#chatMessage').text('Unable to contact the chat. Please try again.');
        }
    };

    let getMessageElement = function(message) {
        let item = $('<div class="message-item"></div>');
        let header = $('<div class="message-header"></div>');
        header.append($('<div class="dateTime"></div>').text(message.dateTime));
        header.append($('<div class="userName"></div>').text(message.userName));
        item.append(header, $('<div class="message-text"></div>').text(message.text));
        return item;
    };

    let updateUsers = function(version) {
        $.get('/user').done(function(users) {
            if (version !== sessionVersion || !signedIn) {
                return;
            }
            $('.users-list').empty();
            for (let user of users) {
                let item = $('<div class="user-item"></div>');
                item.append($('<div class="name"></div>').text(user.name));
                $('.users-list').append(item);
            }
        }).fail(function(response) {
            handleChatError(response, version);
        });
    };

    let updateMessages = function(version) {
        $.get('/message').done(function(messages) {
            if (version !== sessionVersion || !signedIn) {
                return;
            }
            $('.messages-list').empty();
            if (messages.length === 0) {
                $('.messages-list').text('There are no messages yet');
            }
            for (let message of messages) {
                $('.messages-list').append(getMessageElement(message));
            }
        }).fail(function(response) {
            handleChatError(response, version);
        });
    };

    let initApplication = function() {
        clearInterval(refreshInterval);
        let version = ++sessionVersion;
        signedIn = true;
        $('input[type="password"]').val('');
        $('.authentication').hide();
        $('.messages-and-users, .controls').css({display: 'flex'});
        $('.account-controls').show();
        $('#chatMessage').text('');
        let refresh = function() {
            updateUsers(version);
            updateMessages(version);
        };
        refresh();
        refreshInterval = setInterval(refresh, 2000);
    };

    $('#showRegister').on('click', function() {
        $('#loginForm').prop('hidden', true);
        $('#registerForm').prop('hidden', false);
        $('#authMessage').text('');
        $('input[type="password"]').val('');
    });

    $('#showLogin').on('click', function() {
        showLogin();
    });

    $('#registerForm').on('submit', function(event) {
        event.preventDefault();
        let buttons = $('#registerForm button').prop('disabled', true);
        let name = $('#registerName').val().trim();
        $('#authMessage').text('');
        post('/register', {name: name, password: $('#registerPassword').val()})
            .done(function() {
                $('#loginName').val(name);
                showLogin('Account created. Sign in with your password.');
                $('#loginPassword').trigger('focus');
            }).fail(function(response) {
                $('#authMessage').text(response.responseJSON?.message || 'Unable to create an account. Please try again.');
            }).always(function() {
                buttons.prop('disabled', false);
            });
    });

    $('#loginForm').on('submit', function(event) {
        event.preventDefault();
        let buttons = $('#loginForm button').prop('disabled', true);
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
                $('#loginPassword').val('');
                $('#authMessage').text(response.status === 401
                    ? 'Invalid name or password.' : 'Unable to sign in. Please try again.');
            }).always(function() {
                buttons.prop('disabled', false);
            });
    });

    $('#logoutButton').on('click', function() {
        let button = $(this).prop('disabled', true);
        let version = sessionVersion;
        post('/logout').done(function() {
            showLogin('You have signed out.');
        }).fail(function(response) {
            handleChatError(response, version);
        }).always(function() {
            button.prop('disabled', false);
        });
    });

    $('#messageForm').on('submit', function(event) {
        event.preventDefault();
        let message = $('.new-message').val();
        if (!signedIn || !message) {
            return;
        }
        let version = sessionVersion;
        let button = $('.send-message').prop('disabled', true);
        post('/message', {message: message}).done(function(response) {
            if (version !== sessionVersion || !signedIn) {
                return;
            }
            if (response.result) {
                $('.new-message').val('');
                $('#chatMessage').text('');
                updateMessages(version);
            } else {
                $('#chatMessage').text('The message could not be sent.');
            }
        }).fail(function(response) {
            handleChatError(response, version);
        }).always(function() {
            button.prop('disabled', false);
        });
    });

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
