document.addEventListener('DOMContentLoaded', function () {
  initializeProfile();
  initializeTicketmaster();
  loadDebugLogs();
  setupEventListeners();

  // Auto-refresh logs every 2 seconds
  setInterval(loadDebugLogs, 2000);
});

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', function () {
      switchTab(this.dataset.tab);
    });
  });

  // Profile buttons
  document.getElementById('save-profile').addEventListener('click', saveProfile);
  document.getElementById('clear-profile').addEventListener('click', clearProfile);

  // Debug buttons
  document.getElementById('clear-logs').addEventListener('click', function () {
    chrome.storage.local.remove('debug_logs', function () {
      document.getElementById('debug-logs').innerHTML = 'Logs cleared.';
    });
  });

  // Enter key for profile input
  document.getElementById('profile-id').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      saveProfile();
    }
  });
  // Ticketmaster buttons
  document.getElementById('save-tm-password').addEventListener('click', saveTmPassword);

  // Enter key on password field
  document.getElementById('tm-password').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      saveTmPassword();
    }
  });
}

function switchTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
  document.getElementById(`${tab}-content`).classList.add('active');
}

async function initializeProfile() {
  const profileInput = document.getElementById('profile-id');

  try {
    // Check storage first
    const result = await chrome.storage.sync.get(['profile_name']);

    if (result.profile_name) {
      profileInput.value = result.profile_name;
      showStatus('Profile loaded', 'success');
    } else {
      // Try auto-detect
      const detected = await autoDetect();
      if (detected) {
        profileInput.value = detected;
        await chrome.storage.sync.set({ profile_name: detected });
        showStatus('Profile auto-detected', 'success');
      }
    }
  } catch (error) {
    console.error('Profile init failed:', error);
  }
}

async function autoDetect() {
  try {
    const tabs = await chrome.tabs.query({});
    for (let tab of tabs) {
      if (tab.url && tab.url.includes('whoerip.com/multilogin/')) {
        const match = tab.url.match(/multilogin\/([A-Za-z0-9]+)/);
        if (match) return match[1];
      }
    }
  } catch (error) {
    console.error('Auto-detect failed:', error);
  }
  return null;
}

async function saveProfile() {
  const profileId = document.getElementById('profile-id').value.trim();

  if (!profileId) {
    showStatus('Please enter a profile ID', 'error');
    return;
  }

  try {
    await chrome.storage.sync.set({ profile_name: profileId });
    showStatus('Profile saved', 'success');
  } catch (error) {
    showStatus('Save failed', 'error');
  }
}

async function clearProfile() {
  try {
    await chrome.storage.sync.remove(['profile_name']);
    document.getElementById('profile-id').value = '';
    showStatus('Profile cleared', 'success');
  } catch (error) {
    showStatus('Clear failed', 'error');
  }
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';

  setTimeout(() => {
    status.style.display = 'none';
  }, 2000);
}

// Your existing debug functions
function loadDebugLogs() {
  chrome.storage.local.get(['debug_logs'], function (result) {
    const logsContainer = document.getElementById('debug-logs');
    const logs = result.debug_logs || [];

    if (logs.length === 0) {
      logsContainer.innerHTML = 'No debug logs yet.';
      return;
    }

    const logsHtml = logs
      .map((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        return `
                <div class="log-entry">
                    <div class="timestamp">${time}</div>
                    <div>${escapeHtml(log.message)}</div>
                </div>
            `;
      })
      .join('');

    logsContainer.innerHTML = logsHtml;
    logsContainer.scrollTop = logsContainer.scrollHeight;
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function saveTmPassword() {
  const newPassword = document.getElementById('tm-password').value.trim();
  if (!newPassword) {
    showTmStatus('Please enter a password', 'error');
    return;
  }

  try {
    chrome.runtime.sendMessage({ action: 'passwordUpdate', data: { newPassword } });
    showTmStatus('Ticketmaster password saved', 'success');
  } catch (error) {
    showTmStatus('Save failed', 'error');
  }
}

function showTmStatus(message, type) {
  const status = document.getElementById('tm-status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  setTimeout(() => {
    status.style.display = 'none';
  }, 2000);
}
async function initializeTicketmaster() {
  try {
    const data = await new Promise((resolve) => {
      chrome.storage.sync.get(['profileInfo'], resolve);
    });

    if (!data.profileInfo) return;
    let profileInfo = JSON.parse(data.profileInfo);
    document.querySelector('#tm-password').value = profileInfo['tm_pass'];
  } catch (error) {
    console.error('Ticketmaster init failed:', error);
  }
}
