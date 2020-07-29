class NanoNavigator {

    constructor() {
        const modal = document.createElement('div');
        modal.className = 'nanonav-modal';
        modal.innerHTML = `
            <div class="nanonav-modal-content">
                <div class="nanonav-logo"></div>
                <div class="nanonav-close">&times;</div>
                <div class="nanonav-sections">
                    <div id="nanonav-articles" class="nanonav-section">
                        <h5 class="nanonav-header">Article History</h5>
                        <ul class="nanonav-list"></ul>
                    </div>
                    <div id="nanonav-widgets" class="nanonav-section">
                        <h5 class="nanonav-header">Widgets (Floating)</h5>
                        <h6 class="nanonav-sub-section-header">History</h4>
                        <ul class="nanonav-list nanonav-widgets-history"></ul>
                        <h6 class="nanonav-sub-section-header">All</h4>
                        <ul class="nanonav-list nanonav-widgets-all"></ul>
                    </div>
                    <div id="nanonav-providers" class="nanonav-section">
                        <h5 class="nanonav-header">Providers</h5>
                        <h6 class="nanonav-sub-section-header">History</h4>
                        <ul class="nanonav-list nanonav-providers-history"></ul>
                        <h6 class="nanonav-sub-section-header">All</h4>
                        <ul class="nanonav-list nanonav-providers-all"></ul>
                    </div>
                </div>
            </div>
        `;

        const nanoNavButton = document.createElement('div');
        nanoNavButton.className = 'nano-nav-button';
        nanoNavButton.innerHTML = `<div>NANO NAVIGATOR</div>`;
        nanoNavButton.onclick = this.open;

        this.navButton = nanoNavButton;
        this.modal = modal;

        this.closeButton = this.modal.querySelector('.nanonav-close');
        this.closeButton.onclick = this.close;

        this.sections = {
            articles: modal.querySelector('#nanonav-articles .nanonav-list'),
            widgets: modal.querySelector('#nanonav-widgets .nanonav-list'),
            providers: modal.querySelector('#nanonav-providers .nanonav-list')
        };

        this.taskTypes = {
            openWidget: 'open-widget',
            openProvider: 'open-provider'
        };
    };

    build = () => {
        if (document.querySelector('.nanonav-modal')) {
            this.rebuild();
        }
        this.setStorage();
        this.addButton();
        this.addModal();
        this.update();
    };

    rebuild = () => {
        this.navButton.remove();
        this.modal.remove();
        this.build();
    };

    setStorage = () => {
        this.storage = {
            articles: JSON.parse(localStorage.getItem(`nanonav-${this.kb}-articles-history`)) || [],
            widgets: JSON.parse(localStorage.getItem(`nanonav-widgets-history`)) || [],
            providers: JSON.parse(localStorage.getItem(`nanonav-${this.kb}-providers-history`)) || []
        };
    };

    addButton = () => {
        pollElement({
            maxLoops: 50,
            intervalMS: 100,
            elementsToCheck: ['nr-nav-item.item-dashboard', '.navbarItem.item-newDashboard'],
            callback: (dashButton) => {
                dashButton.insertAdjacentElement('beforebegin', this.navButton);
            }
        });
    };

    addModal = () => {
        pollElement({
            maxLoops: 20,
            intervalMS: 250,
            elementsToCheck: ['#main', '#contentDiv'],
            assertInnerHTML: true,
            callback: (mainElement) => {
                mainElement.appendChild(this.modal);
                this.getAllConfigs();
            }
        });
    };

    open = () => {
        if (!document.querySelector('.nanonav-modal')) {
            this.addModal();
        }
        this.modal.style.display = 'block';
        window.scrollTo(0, 0);

        window.onclick = (event) => {
            if (event.target === this.modal) {
                this.close();
            }
        };
    };

    close = () => this.modal.style.display = 'none';

    update = () => {
        this.updateArticles();
        this.updateWidgets();
        this.updateProviders();
    };

    getAllConfigs = () => {
        chrome.storage.sync.get(this.account, result => {
            this.apiKey = result[this.account];
            this.endpoints = {
                getWidgets: `https://${this.account}.nanorep.co/api/domain/v1/list?apiKey=${this.apiKey}`,
                getProviders: `https://${this.account}.nanorep.co/api/conversation/v1/getProviders?kb=${this.kb}&apiKey=${this.apiKey}`
            };
            this.getAllWidgets();
            this.getAllProviders();
        });
    };

    getAllWidgets = () => {
        fetch(`${this.endpoints.getWidgets}`)
            .then(response => response.json())
            .then(widgets => {
                const allConfigsList = document.querySelector('.nanonav-widgets-all');

                if (widgets.length === 0) {
                    allConfigsList.innerHTML = '<div class="nanonav-empty">None</div>';
                } else {
                    let sortedWidgets = [];
                    for (let widget of widgets) {
                        sortedWidgets.push([widget.type, widget.name]);
                    }

                    sortedWidgets.sort();

                    sortedWidgets.forEach(widget => {
                        const currentWidget = widget[1];

                        if (currentWidget !== 'All Domains') {
                            const item = document.createElement('li');
                            item.className = 'nanonav-item';
                            item.innerHTML = `${currentWidget}<div class="nanonav-widget-code"></div><div class="nanonav-widget-home"></div>`;

                            const openWidget = (tab, event) => {
                                this.close();
                                const widgetName = event.target.parentElement.innerText;
                                sessionStorage.setItem('nanonav-task', JSON.stringify({
                                    type: 'open-widget',
                                    widget: widgetName,
                                    tab: tab
                                }));

                                storagePlacer({
                                    storage: this.storage.widgets,
                                    storageKey: 'nanonav-widgets-history',
                                    newItem: widgetName,
                                    maxLength: 3
                                });

                                window.location.href = `https://${this.account.toLowerCase()}.nanorep.co/console/management/?account=${this.account}#setupWidget`;
                                setTimeout(() => {
                                    window.location.reload();    
                                }, 500);
                            };

                            item.querySelector('.nanonav-widget-code').onclick = (event) => openWidget('code', event);
                            item.querySelector('.nanonav-widget-home').onclick = (event) => openWidget('home', event);
                            allConfigsList.appendChild(item);
                        }
                    });
                }
            });
    };

    getAllProviders = () => {
        fetch(`${this.endpoints.getProviders}`)
            .then(response => response.json())
            .then(providers => {
                const allConfigsList = document.querySelector('.nanonav-providers-all');

                const nodeProviders = providers.filter(provider => provider.type === 'NodeJS');

                if (nodeProviders.length === 0) {
                    allConfigsList.innerHTML = '<div class="nanonav-empty">None</div>';
                } else {
                    nodeProviders.forEach(provider => {
                        if (provider.type === 'NodeJS') {
                            const item = document.createElement('li');
                            item.className = 'nanonav-item';
                            item.innerHTML = provider.name;

                            item.onclick = (event) => {
                                this.close();
                                const providerName = event.target.innerText;

                                sessionStorage.setItem('nanonav-task', JSON.stringify({
                                    type: 'open-provider',
                                    provider: providerName
                                }));

                                storagePlacer({
                                    storage: this.storage.providers,
                                    storageKey: `nanonav-${this.kb}-providers-history`,
                                    newItem: providerName,
                                    maxLength: 3
                                });

                                window.location.href = `https://${this.account.toLowerCase()}.nanorep.co/console/management/?account=${this.account}#${this.kb}/kbSettings/providers/`;
                                setTimeout(() => {
                                    window.location.reload();    
                                }, 500);
                            };

                            allConfigsList.appendChild(item);
                        }
                    });
                }
            });
    };

    updateArticles = () => {
        const list = this.sections.articles;
        const labelColors = ['aqua', 'greenyellow', 'darkorange', 'lightpink', 'sandybrown', 'violet', 'wheat', 'lightgray'];

        list.innerHTML = '';

        if (this.storage.articles.length === 0) {
            list.innerHTML = '<div class="nanonav-empty">None</div>';
        } else {
            this.storage.articles.reverse().forEach(article => {
                const item = document.createElement('li');
                item.className = 'nanonav-item';
                item.innerHTML = article.title;
                item.onclick = () => {
                    this.close();
                    window.location.href = `https://${this.account.toLowerCase()}.nanorep.co/admin/#/accounts/${this.account}/kb/${this.kb}/articles/${article.id}`;
                }
                if (article.labels.length > 0) {
                    const labelsContainer = document.createElement('div');
                    labelsContainer.className = 'nanonav-article-labels';

                    article.labels.forEach(label => {
                        const labelDiv = document.createElement('div');
                        labelDiv.className = 'nanonav-article-label';
                        labelDiv.innerHTML = `<span>${label}</span>`;
                        const randomColor = labelColors[Math.floor(Math.random() * labelColors.length)];
                        labelDiv.style.background = randomColor;
                        labelsContainer.appendChild(labelDiv);
                    }, this);

                    item.appendChild(labelsContainer);
                }

                list.appendChild(item);
            }, this);
        }
    };

    updateWidgets = () => {
        const list = this.sections.widgets;
        list.innerHTML = '';

        if (this.storage.widgets.length === 0) {
            list.innerHTML = '<div class="nanonav-empty">None</div>';
        } else {
            this.storage.widgets.reverse().forEach(widget => {
                const item = document.createElement('li');
                item.className = 'nanonav-item';
                item.innerHTML = `${widget}<div class="nanonav-widget-code"></div><div class="nanonav-widget-home"></div>`;

                const openWidget = (tab, event) => {
                    this.close();
                    const widgetName = event.target.parentElement.innerText;
                    sessionStorage.setItem('nanonav-task', JSON.stringify({
                        type: 'open-widget',
                        widget: widgetName,
                        tab: tab
                    }));

                    storagePlacer({
                        storage: this.storage.widgets,
                        storageKey: 'nanonav-widgets-history',
                        newItem: widgetName,
                        maxLength: 3
                    });

                    window.location.href = `https://${this.account.toLowerCase()}.nanorep.co/console/management/?account=${this.account}#setupWidget`;
                    
                    setTimeout(() => {
                        window.location.reload();    
                    }, 500);
                };

                item.querySelector('.nanonav-widget-code').onclick = (event) => openWidget('code', event);
                item.querySelector('.nanonav-widget-home').onclick = (event) => openWidget('home', event);
                list.appendChild(item);
            }, this);
        }
    };

    updateProviders = () => {
        const list = this.sections.providers;
        list.innerHTML = '';

        if (this.storage.providers.length === 0) {
            list.innerHTML = '<div class="nanonav-empty">None</div>';
        } else {
            this.storage.providers.reverse().forEach(provider => {
                const item = document.createElement('li');
                item.className = 'nanonav-item';
                item.innerText = provider;

                item.onclick = (event) => {
                    this.close();
                    const providerName = event.target.innerText;

                    sessionStorage.setItem('nanonav-task', JSON.stringify({
                        type: 'open-provider',
                        provider: providerName
                    }));

                    storagePlacer({
                        storage: this.storage.providers,
                        storageKey: `nanonav-${this.kb}-providers-history`,
                        newItem: providerName,
                        maxLength: 3
                    });

                    window.location.href = `https://${this.account.toLowerCase()}.nanorep.co/console/management/?account=${this.account}#${this.kb}/kbSettings/providers/`;
                    setTimeout(() => {
                        window.location.reload();    
                    }, 500);
                };

                list.appendChild(item);
            }, this);
        }
    };

    saveArticle = () => {
        const parts = window.location.href.split('/');
        const articleID = parts[parts.length - 1];

        if (articleID && !isNaN(articleID)) {
            pollElement({
                maxLoops: 20,
                intervalMS: 250,
                elementsToCheck: '.article__title-wrapper textarea',
                assertValue: true,
                callback: (titleElement) => {
                    const labelElements = document.querySelectorAll('.labels span.label-name');

                    let labels = [];
                    labelElements.forEach(label => {
                        if (!label.innerHTML.includes('Import')) {
                            labels.push(label.innerHTML);
                        }
                    }, this);

                    const title = titleElement.value.length > 60 ? `${titleElement.value.substr(0, 60)} ...` : titleElement.value;

                    const article = {
                        id: articleID,
                        title: title,
                        labels: labels
                    };

                    storagePlacer({
                        storage: this.storage.articles,
                        storageKey: `nanonav-${this.kb}-articles-history`,
                        newItem: article,
                        maxLength: 5,
                        isArticle: true
                    });

                    this.updateArticles();
                }
            });
        }
    };

    saveWidget = (event) => {
        let selectedWidget;

        if (event.target.tagName === 'SPAN') {
            selectedWidget = event.target.innerText;
        }

        if (!selectedWidget) {
            const span = event.target.querySelector('span');
            if (span) {
                selectedWidget = span.innerText;
            }
        }

        if (selectedWidget) {
            storagePlacer({
                storage: this.storage.widgets,
                storageKey: `nanonav-widgets-history`,
                newItem: selectedWidget,
                maxLength: 3
            });

            this.updateWidgets();
        }
    };

    saveProvider = (event) => {
        if (!event.target.className.includes('upDownColumn')) {
            const provider = event.target.parentElement.querySelector('td:nth-child(2)').innerText;

            storagePlacer({
                storage: this.storage.providers,
                storageKey: `nanonav-${this.kb}-providers-history`,
                newItem: provider,
                maxLength: 3
            });

            this.updateProviders();
        }
    };

    addWidgetListeners = () => {
        pollElement({
            maxLoops: 50,
            intervalMS: 100,
            elementsToCheck: '.domainsDiv .item',
            queryAll: true,
            callback: (widgetDropdownItem) => {
                widgetDropdownItem.forEach(widget => {
                    widget.onclick = (event) => {
                        this.saveWidget(event);
                    };
                }, this);
            }
        });
    };

    addProviderListeners = () => {
        pollElement({
            maxLoops: 50,
            intervalMS: 100,
            elementsToCheck: '.providers .listManagerTr',
            queryAll: true,
            callback: (providerRows) => {
                providerRows.forEach(provider => {
                    provider.onclick = (event) => {
                        this.saveProvider(event);
                    };
                }, this);
            }
        });
    };
};

class URLPoller {

    constructor() {
        this.paths = {
            articles: [
                '/articles/'
            ],
            widgets: [
                '#setupWidget/float'
            ],
            providers: [
                'kbSettings/providers'
            ]
        }

        this.currentURL = window.location.href;
        this.poller;
    };

    isOnArticle = () => this.paths.articles.some(path => this.currentURL.includes(path));
    isOnWidget = () => this.paths.widgets.some(path => this.currentURL.includes(path));
    isOnProvider = () => this.paths.providers.some(path => this.currentURL.includes(path));

    checkNewKB = () => {
        pollElement({
            maxLoops: 40,
            intervalMS: 250,
            elementsToCheck: '.kb-selector__title',
            callback: (kbTitleElement) => {
                if (kbTitleElement.title !== nanoNavigator.kb) {
                    nanoNavigator.kb = kbTitleElement.title;
                    nanoNavigator.rebuild();
                }
            }
        });
    };

    check = (initialLoad) => {
        if (!initialLoad) this.checkNewKB();

        if (this.isOnArticle()) nanoNavigator.saveArticle();
        else if (this.isOnWidget()) nanoNavigator.addWidgetListeners();
        else if (this.isOnProvider()) nanoNavigator.addProviderListeners();

        this.start();
    };

    start = () => {
        this.poller = setInterval(() => {
            const url = window.location.href;

            if (url !== this.currentURL) {
                this.stop();
                this.currentURL = url;
                this.check();
            }
        }, 250);
    };

    stop = () => clearInterval(this.poller);
};

const nanoNavigator = new NanoNavigator();
const urlPoller = new URLPoller();

window.onload = () => {
    chrome.storage.sync.get('isActive', result => {
        if (result.isActive === true) {
            pollElement({
                maxLoops: 50,
                intervalMS: 100,
                elementsToCheck: ['.kb-selector__title', '.kbSelectorTitleWrap span'],
                callback: (kbTitleElement) => {
                    nanoNavigator.kb = kbTitleElement.title;
                    checkConnection();
                }
            });
        }
    });
};

const checkConnection = () => {
    const account = window.location.host.split('.')[0];

    chrome.storage.sync.get(null, storage => {
        for (let key of Object.keys(storage)) {
            if (key.toLowerCase() === account) {
                nanoNavigator.account = key;
                const task = JSON.parse(sessionStorage.getItem('nanonav-task'));
                if (task) {
                    handleTask(task);
                } else {
                    nanoNavigator.build();
                    urlPoller.check(true);
                    break;
                }
            }
        }
    });
};

const storagePlacer = ({ storage, storageKey, newItem, maxLength, isArticle }) => {
    let foundIndex;
    const exists = storage.some((storedElement, index) => {
        if (isArticle) {
            if (storedElement.id === newItem.id) {
                foundIndex = index;
                return true;
            }
        } else {
            if (storedElement === newItem) {
                foundIndex = index;
                return true;
            }
        }
    });

    const length = storage.length;

    if (length > maxLength) {
        storage.slice(0, 3);
    }

    if (exists) {
        if (length > 1 && length <= maxLength) {
            storage.splice(foundIndex, 1);
            storage.push(newItem);
        }
    } else {
        if (length === maxLength) {
            storage.pop();
            storage.push(newItem);
        } else {
            storage.push(newItem);
        }
    }

    localStorage.setItem(storageKey, JSON.stringify(storage));
    nanoNavigator.setStorage();
};

const handleTask = (task) => {
    sessionStorage.removeItem('nanonav-task');

    switch (task.type) {
        case nanoNavigator.taskTypes.openWidget:
            pollElement({
                maxLoops: 100,
                intervalMS: 100,
                elementsToCheck: '.floating a',
                callback: (personalizeButton) => {
                    personalizeButton.click();
                    pollElement({
                        maxLoops: 100,
                        intervalMS: 100,
                        elementsToCheck: '.domainsDiv .item span',
                        queryAll: true,
                        callback: (widgetNames) => {
                            widgetNames.forEach(widgetNameSpan => {
                                if (widgetNameSpan.innerText === task.widget) {
                                    widgetNameSpan.click();
                                    if (task.tab === 'code') {
                                        pollElement({
                                            maxLoops: 100,
                                            intervalMS: 100,
                                            elementsToCheck: '.tabsContainer .tab div',
                                            queryAll: true,
                                            callback: (tabs) => {
                                                tabs.forEach(tab => {
                                                    if (tab.innerText === 'Advanced') {
                                                        tab.click();
                                                        window.scroll(0, 1400);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    nanoNavigator.build();
                                    urlPoller.check(true);
                                }
                            }, this);
                        }
                    });
                }
            });
            break;
        case nanoNavigator.taskTypes.openProvider:
            pollElement({
                maxLoops: 100,
                intervalMS: 100,
                queryAll: true,
                elementsToCheck: '.providers .listManagerTr',
                callback: (providerRows) => {
                    let found = false;
                    providerRows.forEach(providerRow => {
                        const provider = providerRow.querySelector('td:nth-child(2)');

                        if (provider && provider.innerText === task.provider) {
                            found = true;
                            setTimeout(() => {
                                provider.click();
                                nanoNavigator.build();
                                urlPoller.check(true);
                            }, 1250);
                        }
                    });
                    setTimeout(() => {
                        if (!found) {
                            nanoNavigator.build();
                            urlPoller.check(true);
                        }
                    }, 1500);
                }
            });
            break;
    }
};

const pollElement = ({ maxLoops, intervalMS, elementsToCheck, queryAll, assertValue, assertInnerHTML, callback }) => {
    let loops = 0;

    if (typeof elementsToCheck === 'string') {
        elementsToCheck = [elementsToCheck];
    }

    const looper = setInterval(() => {
        if (loops++ >= maxLoops) {
            clearInterval(looper);
            return;
        }

        let foundElement;
        elementsToCheck.some(element => {
            let possibleElement;

            if (queryAll) {
                possibleElement = document.querySelectorAll(element);
                if (possibleElement.length > 0) {
                    foundElement = possibleElement;
                    return true;
                }
            } else {
                possibleElement = document.querySelector(element);
                if (possibleElement !== null) {
                    if (assertValue && possibleElement.value) {
                        foundElement = possibleElement;
                        return true;
                    } else if (assertInnerHTML && possibleElement.innerHTML) {
                        foundElement = possibleElement
                        return true;
                    } else if (!assertInnerHTML && !assertValue) {
                        foundElement = possibleElement;
                        return true;
                    }
                }
            }
        });

        if (foundElement) {
            callback(foundElement);
            clearInterval(looper);
            return;
        }
    }, intervalMS);
};