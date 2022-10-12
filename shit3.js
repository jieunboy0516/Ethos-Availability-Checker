(function (global) {
    // Globals
    //if (!global.LHComponents) { global.LHComponents = {}; };
    //var LHComponents = global.LHComponents;

    // To keep track of which embeds we have already processed
    //if (!LHComponents.foundEls) LHComponents.foundEls = [];
    //var foundEls = LHComponents.foundEls;
    
    // Try to get the current script using document.currentScript
    var currentScript = document.currentScript || (function () {
        // If document.currentScript is not supported, get all script tags on the page
        var scripts = document.getElementsByTagName('script');

        // Get the last script in the list, this will be the one currently running
        // NOTE: In order for this to work the 'async' attribute must not appear on 
        // any component script tags (See TFS 11448)
        return scripts[scripts.length - 1];

    })();

    var currentScriptSrc = currentScript.src;
  
    var els = document.getElementsByTagName('script');
    var ctype = 'bookinglist';
    var componentType = ctype === '{{' + 'COMPONENTTYPE' + '}}' ? 'timetable' : 'bookinglist';
    var re = /.*component\/loader/;
   
    var getParameters = function (url, id) {
        // Returns the query string for a supplied URL
        var a = document.createElement('a');
        a.href = url;

        if (a.search.indexOf('?') >= 0) {
            return a.search + '&parentid=' + id;

        } else {
            return a.search + '?parentid=' + id;

        }

    };

    var URLToArray = function(url) {
        var request = {};
        var pairs = url.substring(url.indexOf('?') + 1).split('&');
        for (var i = 0; i < pairs.length; i++) {
            if (!pairs[i])
                continue;
            var pair = pairs[i].split('=');
            request[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
        return request;
    }

    var insertScript = function (el, src, onload) {
        if (src !== undefined) {
            var script = document.createElement('script')
            script.setAttribute("src", src)
            script.setAttribute("type", "text/javascript")
            script.async = false;

            if (onload) {
                script.onload = onload;

            }

            el.parentElement.insertBefore(script, el.parentElement.firstChild);
        }

    };

    var uniqueid  = function() {
        // always start with a letter (for DOM friendlyness)
        var idstr = String.fromCharCode(Math.floor((Math.random() * 25) + 65));
        do {
            // between numbers and characters (48 is 0 and 90 is Z (42-48 = 90)
            var ascicode = Math.floor((Math.random() * 42) + 48);
            if (ascicode < 58 || ascicode > 64) {
                // exclude all chars between : (58) and @ (64)
                idstr += String.fromCharCode(ascicode);
            }
        } while (idstr.length < 32);

        return (idstr);

    }

    // Prepare the div to display the component
    var id = uniqueid();
    var scriptTagElement;

    function setHeader(xhr) {
        if (parameters["accesstoken"]) {
            var accessToken = parameters["accesstoken"];

            if (accessToken) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);

            }
        }
    }
    // Locate the script tag which included this script
    for (var i = 0; i < els.length; i++) {
        var el = els[i];

        if (el.src === currentScriptSrc) { // && foundEls.indexOf(el) < 0) {
            scriptTagElement = el;
        }

    }

    // Get the parameters
    var params = getParameters(scriptTagElement.src, id); // As a string to pass on subsequent request URLs
    var parameters = URLToArray(scriptTagElement.src);    // As an array to access specific parameters

    // Load jQuery 
    //insertScript(els[0], undefined, function () {
        // Create a  div to contain the component
        var s = document.createElement('div');
        s.setAttribute("id", id);
        s.className = 'xn-component';
        s.style.display = 'none';
     
        // If the script tag includes an el parameter
        if (parameters["el"]) {
            // Display the component in the div with the supplied el Id
            var widgetElement = document.getElementById(parameters["el"]);
            widgetElement.appendChild(s);

        } else {
            // If not, replace the script tag with the component
            scriptTagElement.parentNode.replaceChild(s, scriptTagElement);

        }
        
        if (parameters.newcomponent) {
            var requireComponent = function () {
                requirejs.config({
                    waitSeconds: 15, //default is 7
                    config: { text: { useXhr: function () { return true } } },
                    map: {
                        '*': { 'jquery': 'jquery-private', 'popper.js': 'popper' },
                        'jquery-private': { 'jquery': 'jquery' }
                    },
                    shim: {
                        "tinymce": { exports: "tinymce" },
                        "oidc-client": { deps: ['native-promise-only', 'babel-polyfill'] },
                    },
                    urlArgs: 'xnver=2.26.0.8', baseUrl: 'https://www.imperial.ac.uk/sport/members/en/', paths: {"jquery":"https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min","jquery-private":"https://www.imperial.ac.uk/sport/members/scripts/jquery-private","jqueryUi":"https://www.imperial.ac.uk/sport/members/Scripts/jquery-ui-1.12.1.min","datatables.net":"https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.15/js/jquery.dataTables.min","dtResponsive":"https://cdn.datatables.net/responsive/2.2.1/js/dataTables.responsive.min","knockout":"https://cdnjs.cloudflare.com/ajax/libs/knockout/3.4.0/knockout-min","komapping":"https://www.imperial.ac.uk/sport/members/Scripts/knockout.mapping-latest","kosortable":"https://www.imperial.ac.uk/sport/members/Scripts/knockout-sortable.min","moment":"https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.15.1/moment-with-locales.min","datatable-datesort":"https://cdn.datatables.net/plug-ins/1.10.19/sorting/datetime-moment","text":"https://cdnjs.cloudflare.com/ajax/libs/require-text/2.0.12/text.min","svg4everybody":"https://cdnjs.cloudflare.com/ajax/libs/svg4everybody/2.1.9/svg4everybody.min","popper":"https://www.imperial.ac.uk/sport/members/Scripts/umd/popper.min","bootstrap":"https://www.imperial.ac.uk/sport/members/Scripts/bootstrap.min","kovalidation":"https://cdnjs.cloudflare.com/ajax/libs/knockout-validation/2.0.3/knockout.validation.min","oidc-client":"https://www.imperial.ac.uk/sport/members/Scripts/oidc-client/lib/oidc-client.min","oidc-client-dist":"https://cdnjs.cloudflare.com/ajax/libs/oidc-client/1.6.1/oidc-client.min","native-promise-only":"https://cdnjs.cloudflare.com/ajax/libs/native-promise-only/0.8.1/npo","babel-polyfill":"https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min","tinymce":"https://www.imperial.ac.uk/sport/members/Scripts/tinymce/tinymce.min","widget-bookinglist":"areas/widgets/script/bookinglist/init","component":"areas/widgets/script/component","UserIdentity":"areas/widgets/script/common/identity/UserIdentity","postbox":"areas/widgets/script/postbox"}
                });

    
                require(['jquery', 'knockout', 'postbox', 'moment', 'kovalidation', 'text', 'native-promise-only', 'babel-polyfill', 'oidc-client', 'UserIdentity'], function ($, ko, postbox, moment) {

                        var messaging = postbox.instance('https://www.imperial.ac.uk/sport/members/');
                        messaging.locale = 'en';
                        messaging.localeForUrl = 'en/';
                        moment.locale('en-GB');

                    ko.options.deferUpdates = true;

                    var compName = "xn-bookinglist-component".toLowerCase();
                    var viewModel = "Areas/Widgets/Script/bookinglist/bookinglistViewModel";
                    var compParams = {};

                    for (var param in parameters)
                        compParams[param] = parameters[param];

                    $('#' + id).fadeIn(2000)
                        .html("<" + compName + " params='" + JSON.stringify(compParams) + "'></" + compName + ">");

                    if (!ko.components.isRegistered(compName))
                        ko.components.register(compName, { require: viewModel });
                    ko.applyBindings({}, document.getElementById(id));
                });
            };

            if (typeof require !== 'undefined' && require.version && require.version.split(".")[0] === "2")
                requireComponent();
            else {
                var header = document.getElementsByTagName('head');
                insertScript(header[0], "https://www.imperial.ac.uk/sport/members/scripts/require.js", requireComponent);
            }

            return;
        }

        // Load Require JS then load the component once the document and other assets have loaded
        addEventListener('load', function () {
            var header = document.getElementsByTagName('head');
            insertScript(header[0], "https://www.imperial.ac.uk/sport/members/scripts/require.js", function () {

                // Once require is loaded configure it
                requirejs.config({
                    config: {
                        text: {
                            useXhr: function (url, protocol, hostname, port) {
                                // allow cross-domain requests
                                // remote server allows CORS
                                return true;
                            }
                        },
                    },
                    shim: {
                        "oidc-client": { deps: ['native-promise-only', 'babel-polyfill'] },
                    },
                    // Next line prevents jquery to be registered globally and forces developers to explicitly 
                    // import local jquery instance in ts files intead of depending on the globally declared $ variable
                    // To be uncommented after the demo in February'18 to postpone the need for regression testing until then
                    // map: { '*': { 'jquery': 'jquery-private' }, 'jquery-private': { 'jquery': 'jquery' } },
                    urlArgs: 'xnver=2.26.0.8',
                    baseUrl: 'https://www.imperial.ac.uk/sport/members/en/',
                    paths: {"jquery":"https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min","jquery-private":"https://www.imperial.ac.uk/sport/members/scripts/jquery-private","jqueryUi":"https://www.imperial.ac.uk/sport/members/Scripts/jquery-ui-1.12.1.min","datatables.net":"https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.15/js/jquery.dataTables.min","dtResponsive":"https://cdn.datatables.net/responsive/2.2.1/js/dataTables.responsive.min","knockout":"https://cdnjs.cloudflare.com/ajax/libs/knockout/3.4.0/knockout-min","komapping":"https://www.imperial.ac.uk/sport/members/Scripts/knockout.mapping-latest","kosortable":"https://www.imperial.ac.uk/sport/members/Scripts/knockout-sortable.min","moment":"https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.15.1/moment-with-locales.min","datatable-datesort":"https://cdn.datatables.net/plug-ins/1.10.19/sorting/datetime-moment","text":"https://cdnjs.cloudflare.com/ajax/libs/require-text/2.0.12/text.min","svg4everybody":"https://cdnjs.cloudflare.com/ajax/libs/svg4everybody/2.1.9/svg4everybody.min","popper":"https://www.imperial.ac.uk/sport/members/Scripts/umd/popper.min","bootstrap":"https://www.imperial.ac.uk/sport/members/Scripts/bootstrap.min","kovalidation":"https://cdnjs.cloudflare.com/ajax/libs/knockout-validation/2.0.3/knockout.validation.min","oidc-client":"https://www.imperial.ac.uk/sport/members/Scripts/oidc-client/lib/oidc-client.min","oidc-client-dist":"https://cdnjs.cloudflare.com/ajax/libs/oidc-client/1.6.1/oidc-client.min","native-promise-only":"https://cdnjs.cloudflare.com/ajax/libs/native-promise-only/0.8.1/npo","babel-polyfill":"https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min","tinymce":"https://www.imperial.ac.uk/sport/members/Scripts/tinymce/tinymce.min","widget-bookinglist":"areas/widgets/script/bookinglist/init","component":"areas/widgets/script/component","UserIdentity":"areas/widgets/script/common/identity/UserIdentity","postbox":"areas/widgets/script/postbox"}
                });

                require(['jquery', 'oidc-client', 'UserIdentity', 'postbox', 'knockout', 'moment', 'native-promise-only', 'babel-polyfill'], function ($, oidc_client, UserIdentity, postbox, ko, moment) {
                    $('#' + id).hide();

                    var messaging = postbox.instance('https://www.imperial.ac.uk/sport/members/');
                    messaging.locale = 'en';
                    messaging.localeForUrl = 'en/';
                    moment.locale('en-GB');

                    $.ajax({
                        type: 'POST',
                        url: 'https://www.imperial.ac.uk/sport/members/en/widgets/' + componentType + params,
                        data: { parentId: id },
                        beforeSend: setHeader,
                        success: function (data) {
                            $('#' + id).html(data);

                            requirejs(['widget-bookinglist'], function (widget) {
                                ko.options.deferUpdates = true;
                                widget.init(id, parameters);
                                $('#' + id).fadeIn(2000);
                            });
                        }
                    })
                });
            });

        });

    //});

}(this));
