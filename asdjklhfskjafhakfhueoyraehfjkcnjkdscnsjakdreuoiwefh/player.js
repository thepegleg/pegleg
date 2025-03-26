let entry = null;
let gameZip = null;

const oooo = 'https://cors.cbass92.org/https://ooooooooo.ooo';
const zipURL = new URL('https://cors.cbass92.org/https://download.unstable.life/gib-roms/Games/');
const legacyURL = new URL('https://cors.cbass92.org/https://infinity.unstable.life/Flashpoint/Legacy/htdocs/');

// Create copy of unmodified fetch method
const _fetch = window.fetch;

// Automatically convert URL objects to their redirected equivalents
const redirect = async request => {
    let url = {
        // The requested URL, adjusted to use the launch command as the base rather than the current domain or database API
        original: new URL([location.origin, zipURL.origin, legacyURL.origin].some(origin => origin == request.origin) ? request.pathname.substring(1) : request.href, entry.launchCommand),
        // The actual URL from which the requested file will be retrieved
        redirect: ''
    };
    
    // If the entry is zipped and requested file exists inside zip, return object URL of file 
    if (gameZip != null) {
        const cleanUrl = decodeURIComponent('content/' + url.original.hostname + url.original.pathname).toLowerCase();
        const entry = Object.entries(gameZip.files).find(entry => entry[0] === cleanUrl);
        if (entry) {
            const file = entry[1];
            if (file && !file.dir) {
                url.redirect = URL.createObjectURL(await file.async('blob'));
                return url;
            }
        }
    }
    
    // If entry is not zipped or requested file does not exist inside zip, return API request to be fetched later
    url.redirect = legacyURL.href + url.original.hostname + url.original.pathname;
    return url;
};

// Player attributes and initialization methods
const players = [
    {
        source: 'https://unpkg.com/@ruffle-rs/ruffle',
        platforms: [ 'Flash' ],
        extensions: [ '.swf' ],
        
        // Override with extension if it was compiled within the past 24 hours
        get override() {
            const player = window.RufflePlayer;
            if (window.RufflePlayer != null) {
                const extension = player.sources.extension;
                return extension != null && Date.now() - new Date(extension.version.split('+')[1]).getTime() < 86400000;
            }
            return false;
        },
        
        async initialize() {
            // Intercept calls to fetch with code that replaces the requested URL with redirected equivalent
            window.fetch = async (resource, options) => {
                // Get request as URL object
                let resourceURL = new URL(resource instanceof Request ? resource.url : resource);
                
                // ??? (I think this was for some obscure edge case I can't find examples of anymore)
                if (resourceURL.protocol == 'blob:')
                    resourceURL = new URL(resourceURL.pathname);
                
                // Don't redirect if the requested URL belongs to the active player or doesn't use HTTP
                if (this.source.startsWith(resourceURL.origin) || !resourceURL.protocol.startsWith('http'))
                    return await _fetch(resource, options);
                
                // Get redirected URL and fetch
                let redirectInfo = await redirect(resourceURL);
                let response = await _fetch(redirectInfo.redirect, options);
                
                // Spoof URL to bypass sitelocks
                Object.defineProperty(response, 'url', { value: redirectInfo.original.href });
                
                return response;
            };
            
            // Create instance of player
            let player = window.RufflePlayer.newest().createPlayer();
            // Set base URL to path of launch command
            player.config.base = entry.launchCommand.substring(0, entry.launchCommand.lastIndexOf('/') + 1);
            // Allow entries that use ExternalInterface to work
            player.config.allowScriptAccess = true;
            
            // Add player to DOM and load
            document.querySelector('.player').append(player);
            player.load(entry.launchCommand);
            
            // Once loaded, resize player to dimensions of SWF
            player.addEventListener('loadedmetadata', () => {
                if (player.metadata.width > 1 && player.metadata.height > 1) {
                    player.style.width  = player.metadata.width  + 'px';
                    player.style.height = player.metadata.height + 'px';
                }
            });
        }
    },
    {
        source: 'https://create3000.github.io/code/x_ite/latest/x_ite.min.js',
        platforms: [ 'VRML', 'X3D' ],
        extensions: [ '.wrl', '.wrl.gz', '.x3d' ],
        
        // There's currently no actively-developed X_ITE browser extension, so this will always return false
        get override() { return false; },
        
        async initialize() {
            // Create copy of unmodified createElement method
            const _createElement = document.createElement;
            // Intercept calls to createElement with code that replaces the source value of <img> elements with redirected equivalent
            document.createElement = function(...args) {
                let observer = new MutationObserver(async records => {
                    // Only redirect requests that haven't already been redirected yet
                    let r = records.findIndex(record => !['blob:', zipURL.href, legacyURL.href].some(prefix => record.target.src.startsWith(prefix)));
                    if (r != -1) records[r].target.src = (await redirect(new URL(records[r].target.src))).redirect;
                });
                
                // Create the element
                let element = _createElement.apply(this, args);
                // If created element is an <img> element, observe changes to source value
                if (element.tagName == 'IMG')
                    observer.observe(element, { attributes: true, attributeFilter: ['src'] });
                
                return element;
            };
            
            // Create instance of player
            let player = X3D.createBrowser();
            // There's no way to identify the intended dimensions of a VRML/X3D file, so always resize to 900x600
            player.style.width = '900px';
            player.style.height = '600px';
            // Set base URL to path of launch command
            player.browser.baseURL = entry.launchCommand.substring(0, entry.launchCommand.lastIndexOf('/') + 1);
            
            // Add player to DOM and load
            document.querySelector('.player').append(player);
            player.browser.loadURL(new X3D.MFString((await redirect(new URL(entry.launchCommand))).redirect));
        }
    }
];

// Build API request
let request = oooo + '/get';
// If query string exists in current URL, assume the client wants to access a specific entry, and append to request as ID
if (location.search != '')
    request += '?id=' + location.search.substring(1);
// If there is no query string, assume the client wants to access a random entry, and apply NSFW filter if enabled 
else if (localStorage.getItem('filter') != 'false')
    request += '?filter=true';

// Fetch API request
fetch(request).then(async response => {
    // Deserialize JSON response
    try {
        entry = await response.json();
    // If deserialization fails, replace page content with error message
    } catch {
        document.querySelector('.header').textContent = 'The specified entry is invalid.';
        document.querySelectorAll('.content *:not(.header)').forEach(elem => elem.style.display = 'none');
        return;
    }
    
    // Add entry title to page title and display above player
    document.title = entry.title + ' - 9o3o';
    document.querySelector('.header').textContent = entry.title;
    
    // Allow NSFW filter preferences to persist across page loads using localStorage
    let toggle = document.querySelector('.toggle input');
    if (localStorage.getItem('filter') == 'false') toggle.checked = false;
    toggle.addEventListener('change', e => {
        localStorage.setItem('filter', e.target.checked.toString());
    });
    
    // Update right-hand footer links
    document.querySelector('.info').href = 'https://flashpointproject.github.io/flashpoint-database/search/#' + entry.uuid;
    document.querySelector('.link').href = './?' + entry.uuid;
    
    // Calculate rating and total votes
    let total = entry.votesWorking + entry.votesBroken;
    if (total > 0) {
        document.querySelector('.fraction').textContent = (Math.round((entry.votesWorking / total) * 100) / 10) + '/10';
        document.querySelector('.total').textContent = total;
    }
    
    // Send POST request and hide voting buttons when vote is submitted
    document.querySelectorAll('.button').forEach(elem => elem.addEventListener('click', () => {
        document.querySelector('.vote').textContent = 'Thank you.';
        _fetch(`${oooo}/${elem.classList[1]}?id=${entry.uuid}`, { method: 'POST' });
    }));
    
    // Identify appropriate player based on launch command
    let p = Math.max(0, (launchPath =>
        players.findIndex(player => player.extensions.some(ext => launchPath.toLowerCase().endsWith(ext)))
    )(new URL(entry.launchCommand).pathname));
    
    // Don't load a second instance of player if it's already active (ie. by using an extension)
    if (players[p].override)
        prepareEntry();
    // Otherwise, load player by appending <script> element to page
    else {
        let script = document.createElement('script');
        script.src = players[p].source;
        script.addEventListener('load', prepareEntry);
        document.head.append(script);
    }
    
    // Get zip if needed, and begin setting up player and redirector
    async function prepareEntry() {
        if (entry.isZipped) {
            // If the entry is zipped, retrieve zip from API and load into JSZip
            try {
                gameZip = await new JSZip().loadAsync(await fetch(new URL(`${zipURL.toString()}${entry.uuid}-${entry.utcMilli}.zip`)).then(r => r.blob()));
            // If there are issues retrieving/loading the zip, display error message in place of player
            } catch {
                let player = document.querySelector('.player');
                player.style.fontSize = '12px';
                player.style.padding = '16px 0 20px';
                player.textContent = 'Failed to load entry. This is not an emulator issue.';
                return;
            }
        }
        
        // Add player to DOM and activate redirector
        players[p].initialize();
    }
});