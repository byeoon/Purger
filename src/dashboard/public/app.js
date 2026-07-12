document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('landing-page')) {
        initLandingPage();
    } else if (document.body.classList.contains('dashboard-page')) {
        initDashboardPage();
    }
});

async function initLandingPage() {
    const statsElements = {
        guilds: document.getElementById('stat-guilds'),
        users: document.getElementById('stat-users'),
        ping: document.getElementById('stat-ping'),
        uptime: document.getElementById('stat-uptime')
    };

    try {
        const res = await fetch('/api/stats');
        if (res.ok) {
            const stats = await res.json();
            if (statsElements.guilds) statsElements.guilds.textContent = stats.guildsCount.toLocaleString();
            if (statsElements.users) statsElements.users.textContent = stats.usersCount.toLocaleString();
            if (statsElements.ping) statsElements.ping.textContent = `${stats.latency} ms`;
            if (statsElements.uptime) statsElements.uptime.textContent = formatUptime(stats.uptime);
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
    try {
        const userRes = await fetch('/api/user');
        if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.user) {
                const heroBtn = document.getElementById('hero-login-btn');
                const navBtn = document.getElementById('nav-login-btn');

                if (heroBtn) {
                    heroBtn.href = '/dashboard.html';
                    heroBtn.innerHTML = `
                        <span>Go to Dashboard Console</span>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    `;
                }
                if (navBtn) {
                    navBtn.href = '/dashboard.html';
                    navBtn.innerHTML = `
                        <span>Dashboard</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                    `;
                }
            }
        }
    } catch (err) {

    }
}

let activeGuildId = null;

async function initDashboardPage() {
    let currentUser = null;
    try {
        const userRes = await fetch('/api/user');
        if (!userRes.ok) {
            window.location.href = '/index.html';
            return;
        }
        const data = await userRes.json();
        currentUser = data.user;
        window.DISCORD_CLIENT_ID = data.clientId;
        renderUserProfile(currentUser);
    } catch (err) {
        console.error('Session validation error:', err);
        window.location.href = '/index.html';
        return;
    }

    try {
        const guildsRes = await fetch('/api/guilds');
        if (guildsRes.ok) {
            const data = await guildsRes.json();
            renderGuildsList(data.guilds);
        } else {
            document.getElementById('guild-list').innerHTML = `
                <div class="guild-loading">
                    <span class="status-inactive">Error fetching servers. Please refresh.</span>
                </div>
            `;
        }
    } catch (err) {
        console.error('Guilds fetching error:', err);
    }

    const form = document.getElementById('config-form');
    if (form) {
        form.addEventListener('submit', handleSaveSettings);
    }

    const welcomeCheckbox = document.getElementById('toggle-welcome-module');
    const whitelistCheckbox = document.getElementById('toggle-whitelist-module');
    if (welcomeCheckbox) welcomeCheckbox.addEventListener('change', updateUIForToggles);
    if (whitelistCheckbox) whitelistCheckbox.addEventListener('change', updateUIForToggles);
}

function renderUserProfile(user) {
    const userInfoEl = document.getElementById('navbar-user-info');
    if (!userInfoEl) return;

    // Use default avatar if none exists
    const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`;

    userInfoEl.innerHTML = `
        <div class="user-profile">
            <img class="user-avatar" src="${avatarUrl}" alt="${user.username}" />
            <span class="user-name">${user.username}</span>
        </div>
        <button class="btn-logout" id="btn-logout" onclick="logoutUser()">Log Out</button>
    `;
}

function logoutUser() {
    window.location.href = '/api/auth/logout';
}
function renderGuildsList(guilds) {
    const listEl = document.getElementById('guild-list');
    if (!listEl) return;

    if (guilds.length === 0) {
        listEl.innerHTML = `
            <div class="guild-loading">
                <span>No servers found where you have Administrator permissions.</span>
            </div>
        `;
        return;
    }
    listEl.innerHTML = '';

    guilds.forEach(guild => {
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${getDiscordClientIdFromPage() || ''}&permissions=8&scope=bot+applications.commands&guild_id=${guild.id}`;

        const item = document.createElement('button');
        item.className = 'guild-item';
        item.id = `guild-item-${guild.id}`;
        const iconUrl = guild.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`
            : null;

        const initials = guild.name.split(' ').map(n => n[0]).join('').slice(0, 3);
        const iconStyle = iconUrl ? `style="background-image: url('${iconUrl}'); color: transparent;"` : '';

        item.innerHTML = `
            <div class="guild-avatar" ${iconStyle}>${initials}</div>
            <div class="guild-info">
                <span class="guild-name">${guild.name}</span>
                <span class="guild-status ${guild.botInGuild ? 'status-active' : 'status-inactive'}">
                    ${guild.botInGuild ? 'Online' : 'Not Connected'}
                </span>
            </div>
            ${!guild.botInGuild ? `<a href="${inviteUrl}" target="_blank" class="guild-invite-link" onclick="event.stopPropagation();">Invite</a>` : ''}
        `;

        if (guild.botInGuild) {
            item.addEventListener('click', () => selectGuild(guild));
        } else {
            item.addEventListener('click', () => {
                window.open(inviteUrl, '_blank');
            });
        }

        listEl.appendChild(item);
    });
}

async function selectGuild(guild) {
    document.querySelectorAll('.guild-item').forEach(el => el.classList.remove('active'));

    const selectedEl = document.getElementById(`guild-item-${guild.id}`);
    if (selectedEl) selectedEl.classList.add('active');
    activeGuildId = guild.id;
    const placeholderEl = document.getElementById('settings-placeholder');
    const contentEl = document.getElementById('settings-content');

    if (placeholderEl) placeholderEl.classList.add('hidden');
    if (contentEl) {
        contentEl.classList.remove('hidden');
        contentEl.style.opacity = '0.5';
    }

    try {
        const res = await fetch(`/api/guilds/${guild.id}/config`);
        if (res.ok) {
            const data = await res.json();

            const iconUrl = guild.icon
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`
                : null;
            const initials = guild.name.split(' ').map(n => n[0]).join('').slice(0, 3);
            const iconStyle = iconUrl ? `style="background-image: url('${iconUrl}'); color: transparent;"` : '';

            const headerEl = document.getElementById('active-guild-header');
            if (headerEl) {
                headerEl.innerHTML = `
                    <div class="guild-avatar" ${iconStyle}>${initials}</div>
                    <div>
                        <h2>${guild.name}</h2>
                        <p class="panel-subtitle">Guild ID: ${guild.id}</p>
                    </div>
                `;
            }

            const welcomeTgl = document.getElementById('toggle-welcome-module');
            if (welcomeTgl) {
                welcomeTgl.checked = data.config && data.config.welcomeModule === true;
            }

            const whitelistTgl = document.getElementById('toggle-whitelist-module');
            if (whitelistTgl) {
                whitelistTgl.checked = !data.config || data.config.whitelistModule !== false;
            }

            const welcomeChannelSelect = document.getElementById('select-welcome-channel');
            if (welcomeChannelSelect) {
                welcomeChannelSelect.innerHTML = '<option value="">-- None / Select a Channel --</option>';
                const sortedChannels = data.channels.sort((a, b) => a.name.localeCompare(b.name));
                sortedChannels.forEach(chan => {
                    const opt = document.createElement('option');
                    opt.value = chan.id;
                    opt.textContent = `#${chan.name}`;
                    if (data.config && data.config.welcomeChannelId === chan.id) {
                        opt.selected = true;
                    }
                    welcomeChannelSelect.appendChild(opt);
                });
            }

            const roleSelect = document.getElementById('select-whitelist-role');
            if (roleSelect) {
                roleSelect.innerHTML = '<option value="">-- None / Select a Role --</option>';
                const sortedRoles = data.roles.sort((a, b) => a.name.localeCompare(b.name));
                sortedRoles.forEach(role => {
                    const opt = document.createElement('option');
                    opt.value = role.id;
                    opt.textContent = `@${role.name}`;
                    if (data.config && data.config.whitelistRoleId === role.id) {
                        opt.selected = true;
                    }
                    roleSelect.appendChild(opt);
                });
            }
            const whitelistChannelSelect = document.getElementById('select-whitelist-channel');
            if (whitelistChannelSelect) {
                whitelistChannelSelect.innerHTML = '<option value="">-- None / Select a Channel --</option>';
                const sortedChannels = data.channels.sort((a, b) => a.name.localeCompare(b.name));
                sortedChannels.forEach(chan => {
                    const opt = document.createElement('option');
                    opt.value = chan.id;
                    opt.textContent = `#${chan.name}`;
                    if (data.config && data.config.whitelistChannelId === chan.id) {
                        opt.selected = true;
                    }
                    whitelistChannelSelect.appendChild(opt);
                });
            }

            updateUIForToggles();
            contentEl.style.opacity = '1';
        } else {
            alert('Failed to fetch configurations for this guild.');
        }
    } catch (err) {
        console.error('Error fetching guild settings:', err);
    }
}

function updateUIForToggles() {
    const welcomeEnabled = document.getElementById('toggle-welcome-module').checked;
    const whitelistEnabled = document.getElementById('toggle-whitelist-module').checked;

    const welcomeChannelGroup = document.getElementById('welcome-channel-group');
    const whitelistRoleGroup = document.getElementById('whitelist-role-group');
    const whitelistChannelGroup = document.getElementById('whitelist-channel-group');

    if (welcomeChannelGroup) {
        welcomeChannelGroup.classList.toggle('disabled', !welcomeEnabled);
        welcomeChannelGroup.querySelector('select').disabled = !welcomeEnabled;
    }
    if (whitelistRoleGroup) {
        whitelistRoleGroup.classList.toggle('disabled', !whitelistEnabled);
        whitelistRoleGroup.querySelector('select').disabled = !whitelistEnabled;
    }
    if (whitelistChannelGroup) {
        whitelistChannelGroup.classList.toggle('disabled', !whitelistEnabled);
        whitelistChannelGroup.querySelector('select').disabled = !whitelistEnabled;
    }
}

async function handleSaveSettings(event) {
    event.preventDefault();
    if (!activeGuildId) return;

    const btn = document.getElementById('btn-save-settings');
    const feedback = document.getElementById('config-feedback-msg');

    if (btn) btn.disabled = true;
    if (feedback) {
        feedback.className = 'config-feedback-msg';
        feedback.textContent = 'Saving...';
        feedback.classList.add('show');
    }

    const payload = {
        welcomeModule: document.getElementById('toggle-welcome-module').checked,
        welcomeChannelId: document.getElementById('select-welcome-channel').value || null,
        whitelistModule: document.getElementById('toggle-whitelist-module').checked,
        whitelistRoleId: document.getElementById('select-whitelist-role').value || null,
        whitelistChannelId: document.getElementById('select-whitelist-channel').value || null
    };

    try {
        const res = await fetch(`/api/guilds/${activeGuildId}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            if (feedback) {
                feedback.className = 'config-feedback-msg success show';
                feedback.textContent = 'Settings saved successfully!';
            }
        } else {
            const errData = await res.json();
            if (feedback) {
                feedback.className = 'config-feedback-msg error show';
                feedback.textContent = errData.error || 'Failed to save settings.';
            }
        }
    } catch (err) {
        console.error('Save configuration error:', err);
        if (feedback) {
            feedback.className = 'config-feedback-msg error show';
            feedback.textContent = 'Error connecting to server.';
        }
    } finally {
        if (btn) btn.disabled = false;
        setTimeout(() => {
            if (feedback) {
                feedback.classList.remove('show');
            }
        }, 3000);
    }
}

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);

    if (d > 0) return `${d}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

function getDiscordClientIdFromPage() {
    return window.DISCORD_CLIENT_ID || '';
}
