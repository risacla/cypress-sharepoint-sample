// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })


Cypress.Commands.add('spAuth', function () {
  const options = {
    username: Cypress.env('username'),
    password: Cypress.env('password'),
    pageUrl: Cypress.env('appUrl')
  };
  
  cy.task('SharePointLogin', options).then(result => {
    cy.clearCookies();
    
    result.cookies.forEach(cookie => {
      cy.setCookie(cookie.name, cookie.value, {
        domain: cookie.domain,
        expiry: cookie.expires,
        httpOnly: cookie.httpOnly,
        path: cookie.path,
        secure: cookie.secure
      });
      Cypress.Cookies.preserveOnce(cookie.name);
    });
  });
});

/**
 * Allows you to first grab an access token before opening the SharePoint page
 */
Cypress.Commands.add("visitWithAdal", (pageUrl) => { 
  const config = {
    username: process.env.CI ? Cypress.env('USERNAME') : Cypress.env('username'),
    password: process.env.CI ? Cypress.env('PASSWORD') : Cypress.env('password'),
    tenant: process.env.CI ? Cypress.env('TENANT') : Cypress.env('tenant'),
    clientId: process.env.CI ? Cypress.env('CLIENTID') : Cypress.env('clientid'),
    clientSecret: process.env.CI ? Cypress.env('CLIENTSECRET') : Cypress.env('clientsecret'),
    resource: process.env.CI ? Cypress.env('RESOURCE') : Cypress.env('resource')
  };

  // Fetch the access token for the Microsoft Graph
  cy.request({
    method: 'POST',
    url: `https://login.microsoft.com/${config.tenant}/oauth2/token`,
    headers: {
       'cache-control': 'no-cache',
       'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: true,
    body: {
      grant_type: 'password',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      resource: config.resource,
      password: config.password,
      username: config.username
    }
  }).then(response => {
    if (response && response.status === 200 && response.body) {
      const accessToken = response.body["access_token"];
      const expires = response.body["expires_on"];
      // Store the retrieved access token in the session storage
      cy.window().then((crntWindow) => {
        crntWindow.sessionStorage.setItem(`adal.token.keys`, `${config.resource}|`);
        crntWindow.sessionStorage.setItem(`adal.expiration.key${config.resource}`, expires);
        crntWindow.sessionStorage.setItem(`adal.access.token.key${config.resource}`, accessToken);
        
        cy.visitSP(pageUrl);
      });
    }
  });
});

/**
 * Visit SharePoint Page
 */
Cypress.Commands.add("visitSP", (pageUrl) => {
  const config = {
    username: process.env.CI ? Cypress.env('USERNAME') : Cypress.env('username'),
    password: process.env.CI ? Cypress.env('PASSWORD') : Cypress.env('password'),
    pageUrl
  };

  cy.task('NodeAuth', config).then((data) => {
    cy.visit(config.pageUrl, {
      headers: data.headers,
      onBeforeLoad: (win) => {
        console.log("ONBEFORELOAD", pageUrl);
        // onBeforeLoad not working in override: https://github.com/cypress-io/cypress/issues/5633
        // Let the child think it runs in the parent
        win["parent"] = win;
      }
    });
  });
});

/**
 * Overwriting the original visit Cypress function to add authentication
 */
// Cypress.Commands.overwrite("visit", (originalFn, pageUrl, options) => { 
//   const config = {
//     username: process.env.CI ? Cypress.env('USERNAME') : Cypress.env('username'),
//     password: process.env.CI ? Cypress.env('PASSWORD') : Cypress.env('password'),
//     pageUrl
//   };

//   cy.task('NodeAuth', config).then((data) => {
//     originalFn({
//       method: "GET",
//       url: pageUrl,
//       headers: data.headers
//     });
//   });
// });

let active_tab_index = 0;
let myTabs = [];
if(window.top.myTabs){
    window.top.myTabs.forEach((tab,i)=>{
        if(i===0 || !tab){
            return;
        }
        try{
            tab.close()
            window.top.myTabs[i] = null
        }catch(e){

        }
    })
}
window.top.myTabs = myTabs;
let myTabNames = [];
window.top.myTabNames = myTabNames;

// TODO: make this a nice collapsing table
function debugTabState() {
    // comment this out to silence it
    console.warn('-----debugTabState: active_tab:',active_tab_index + ' ' + myTabNames[active_tab_index])
    myTabs.forEach((_win, k) => {
        console.warn(k, {
            active_tab_index,
            name: myTabNames[k],
            win: _win,
            winATABNAME: _win? _win.ATABNAME : null,
            app_name: _win? _win.APP_NAME: null // something i use for debugging
        })
    })
}

Cypress.Commands.add('debugTabHelper',()=>{
    debugTabState();
    return {
        active_tab_index,
        myTabNames,
        myTabs,
    }
})

// Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
//     // support for keying the first window with a tab_name like our child windows to simplify switching windows and making it readable
//     // instead of keeping track of array indexes
//     // can pass options as first param too
//     let tab_name = null;
//     if (url && url.tab_name) {
//         tab_name = url.tab_name
//     }
//     if (options && options.tab_name) {
//         tab_name = options.tab_name
//     }
//     if(tab_name){
//         myTabNames[0] = tab_name
//     }else{
//         myTabNames[0] = 'root'
//     }
//     myTabs[0] = cy.state('window')
//     // originalFn is the existing `visit` command that you need to call
//     // and it will receive whatever you pass in here.
//     //
//     // make sure to add a return here!
//     return originalFn(url, options)
// })

// note: cy.reload win.location.reload, etc break our context aware popups
// use this special visit function that maintains our context awareness when navigating on the currently active context
Cypress.Commands.add('tabVisit', (url, tab_name) => {
    if(typeof(tab_name)==="undefined"){
        tab_name = myTabNames[myTabNames.indexOf(active_tab_index)]
    }
    let window_index = myTabNames.indexOf(tab_name)

    console.warn('tabVisit', {
        tab_name,
        window_index
    })

    if (window_index === 0) {
        // for root window, reattach after iframe onload
        return new Cypress.Promise((resolve) => {
            active_tab_index = 0
            let base_window =  myTabs[0] || cy.state('window')
            let aut = base_window.top.document.getElementsByClassName('aut-iframe')[0]
            // console.warn('aut?', aut, originalWindow.document.getElementsByClassName('aut-iframe')[0])
            aut.onload = function () {
                aut.onload = null;
                active_tab_index = 0
                setTimeout(() => {
                    active_tab_index = 0
                    myTabs[0] = aut.contentWindow
                    cy.state('document', aut.contentWindow.document)
                    cy.state('window', aut.contentWindow)
                    console.log('>>> after iframe loaded')
                    debugTabState()
                    resolve()
                }, 500)
            }
            aut.contentWindow.location.href = url
            active_tab_index = 0
        })
    } else {
        // for popupwindows, just call openTab
        active_tab_index = window_index
        return cy.openTab(url, {window_index, tab_name}).then(() => {
            console.log('AFTER OPENTAB')
            active_tab_index = window_index
        })
    }
})

let popupcounter = 0;

Cypress.Commands.add('openTab', (url, opts) => {
    opts = Object.assign({
        timeout: null,
        // window_index: null,
        tab_name: null,
        // https://developer.mozilla.org/en-US/docs/Web/API/Window/open
        windowFeatures: null
    },opts)
    if(!opts.tab_name){
        throw new Error('please give your tab a name');
    }
    if (!myTabs[0]) {
        myTabs[0] = cy.state('window'); // capture the root window if we haven't already
        myTabs[0].ATABNAME = myTabNames[0]
    }
    const w = Cypress.config('viewportWidth')
    const h = Cypress.config('viewportHeight')
    if (!opts.windowFeatures) {
        opts.windowFeatures = `width=${w}, height=${h}`
    }
    let indexNext = myTabs.length
    let name_index = myTabNames.indexOf(opts.tab_name)
    console.warn('openTab',{name_index,indexNext,active_tab_index})
    if (name_index > -1) {
        indexNext = name_index
    }
    myTabNames[indexNext] = opts.tab_name;
    function finalize(){
        // let windowName = 'popup' + performance.now();
        // let windowName = 'popup' + popupcounter;
        let windowName = 'popup' + opts.tab_name;
        let promise = new Cypress.Promise(resolve => {
            console.warn('>>>> openTab %s "%s %s"', url, opts.windowFeatures, indexNext, opts.tab_name);
            // https://developer.mozilla.org/en-US/docs/Web/API/Window/open
            popupcounter++;
            let popup = myTabs[indexNext] ? myTabs[indexNext] : window.top.open(url, windowName, opts.windowFeatures)
            myTabs[indexNext] = popup
            myTabs[indexNext].ATABNAME = myTabNames[indexNext]
            // letting page enough time to load and set "document.domain = localhost"
            // so we can access it
            function checkReady(){
                // thought checking document.domain would work but it never seems to update
                // if(popup.document.domain !== "localhost"){
                // checking body length is important for chrome tho, otherwise it will try and execute tests on about:blank
                if(!popup.document.body || popup.document.body.innerHTML.length===0){
                    setTimeout(()=>{
                        checkReady()
                    },32); // arbitrary delay
                }else{
                    cy.state('document', popup.document)
                    cy.state('window', popup)
                    console.warn('>>>> after openTab')
                    debugTabState()
                    resolve();
                }
            }
            checkReady();
        })
        return promise
    }
    active_tab_index = indexNext;
    if(myTabs[indexNext]){
        cy.closeTab(indexNext).then(finalize)
        // return finalize()
    }else{
        return finalize()
    }
})

Cypress.Commands.add('switchToTab', (index_or_name) => {
    return new Cypress.Promise((resolve) => {
        let index = resolve_index_or_name_to_index(index_or_name)
        console.warn('switchToTab',{index,index_or_name})
        active_tab_index = index;
        let winNext = myTabs[active_tab_index]
        if(!winNext){
            throw new Error('tab missing')
        }
        cy.state('document', winNext.document)
        cy.state('window', winNext)
        debugTabState()
        resolve()
    })
})

/* close all popup windows */
Cypress.Commands.add('closeAllTabs', () => {
    if (!myTabs.length) {
        return;
    }
    myTabs.forEach((v, k) => {
        if (k > 0) {
            try {
                myTabs[k].close()
            } catch (e) {
                console.error(e)
            }
            myTabs[k] = null;
        }
    })
    myTabNames.splice(1)
    myTabs.splice(1) // keep first one only
    // return to state 0 (main / root / original window)
    active_tab_index = 0;
    cy.state('document', myTabs[0].document)
    cy.state('window', myTabs[0])
})

function resolve_index_or_name_to_index(index_or_name){
    let index = parseInt(index_or_name) >= 0 ? index_or_name : active_tab_index || 0
    let name_index = myTabNames.indexOf(index_or_name)
    if(name_index>-1){
        index = name_index
    }
    return index;
}

/* pass an index to close a specific window, otherwise, pass nothing to delete the most recently open window in the stack */
Cypress.Commands.add('closeTab', (index_or_name) => {
    let index = resolve_index_or_name_to_index(index_or_name)
    console.warn('closeTab',{index_or_name,index})
    if (index === 0) {
        console.error('cant close root window')
        return //new Cypress.Promise.resolve(true);
    }
    myTabs[index].close()
    myTabs[index] = null;
    // NOTE we leave the null in the array so that other window index references aren't thrown off
    // NOTE we don't refocus any window here, that's up to you to call switchToTab() after close
    // unless there's no windows left, in which case we return you to window 0
    let filteredList = myTabs.filter(tab => tab)
    if(filteredList.length === 1){
        cy.switchToTab(0)
    }
    // TODO if there are trailing squential trailing nulls, we could probably safely drop them from
    // myTabs and myTabNames
    //cy.switchToTab(active_tab_index)
})