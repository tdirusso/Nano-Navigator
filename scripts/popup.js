window.onload = () => {
    checkIsActive();
    buildTable();
    getConnection();
    document.getElementById('add-button').onclick = addNewAccount;
};

const toggle = () => {
    chrome.storage.sync.get('isActive', result => {
        chrome.storage.sync.set({ isActive: !result.isActive });
    });
};

const checkIsActive = () => {
    chrome.storage.sync.get('isActive', result => {
        if (result.isActive === undefined) {
            document.getElementById('activator').click();
            chrome.storage.sync.set({ isActive: true });
        } else if (result.isActive === true) {
            document.getElementById('activator').click();
        }
        document.getElementById('activator').onclick = toggle;
    });
};

const buildTable = () => {
    chrome.storage.sync.get(null, storage => {
        for (let key of Object.keys(storage)) {
            if (key !== 'isActive') {
                addRow(key, storage[key]);
            }
        }
    });
};

const addNewAccount = () => {
    const accountElement = document.getElementById('new-account');

    if (!accountElement.value) {
        document.getElementById('new-account').focus();
        document.getElementById('new-account').select();

        alert('Please enter a valid NanoRep account name.');

        return;
    }

    const keyElement = document.getElementById('new-key');

    if (!keyElement.value || keyElement.value.length !== 36) {
        document.getElementById('new-key').focus();
        document.getElementById('new-key').select();

        alert('Please enter a valid NanoRep API Key.');

        return;
    }

    const account = accountElement.value.replace(/ /g, '');
    const key = keyElement.value;

    chrome.storage.sync.get(account, storedAccount => {
        if (Object.keys(storedAccount).length === 0) {
            let json = {};
            json[account] = key;

            chrome.storage.sync.set(json);

            addRow(account, key);

            accountElement.value = '';
            keyElement.value = '';
            getConnection();
        } else {
            alert(`You have already created an entry for ${account}.`);
        }
    });
};

const addRow = (account, key) => {
    const table = document.querySelector('#keys-table tbody');

    const row = table.insertRow(-1);
    const accountCell = row.insertCell(0);
    const keyCell = row.insertCell(1);

    accountCell.innerHTML = account;
    keyCell.innerHTML = `...${key.substring(key.length - 6)}`;

    const deleteButton = document.createElement('div');
    deleteButton.className = 'delete-row-button';

    deleteButton.onclick = function () {
        deleteRow(this);
    };

    keyCell.append(deleteButton);
};

const deleteRow = (button) => {
    const account = button.parentElement.previousElementSibling.innerText;
    chrome.storage.sync.remove(account);
    button.parentElement.parentElement.remove();
    getConnection();
};

const getConnection = () => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
        const account = tabs[0].url.split('//')[1].split('.')[0];

        chrome.storage.sync.get(null, storage => {
            let found = false;
            for (let key of Object.keys(storage)) {
                if (key.toLowerCase() === account) {
                    found = true;
                    document.getElementById('status').innerHTML = `Connected to <b>${account}</b>`;
                    document.getElementById('status').className = 'connected';
                }
            }
            if (!found) {
                document.getElementById('status').innerHTML = `Not Connected`;
                document.getElementById('status').className = 'not-connected';
            }
        });
    });
};