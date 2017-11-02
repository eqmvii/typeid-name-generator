// filemaker.js
// A node.js script that uses the EVE ESI API 
// to create a file matching typename and type_id attributes
// uses the types API to get a list of types
// then the individual type API to get name data for each type
// logs errors and tries to correct them

const fetch = require('node-fetch');
const fs = require('fs');

var page_to_fetch = 1;
var base_url = "https://esi.tech.ccp.is/latest/universe/types/?datasource=tranquility&page=";
var done = false;
const PAGES_DELAY = 4;

recursive_data_fetcher();

function recursive_data_fetcher() {
    console.log(`Function called, fetching page ${page_to_fetch}`);
    var fetch_url = base_url + page_to_fetch;
    console.log(fetch_url);
    fetch(fetch_url)
        .then(res => {
            if (res.ok) {
                return res.json();
            }
            else { throw Error(res.statusText) }
        })
        .then(resOne => {
            // console.log(resOne);
            if (resOne.length === 0) {
                done = true;
                console.log("Script complete!");
                return;
            }
            page_to_fetch += 1;
            for (let i = 0; i < resOne.length; i++) {
                var fetch_url = "https://esi.tech.ccp.is/latest/universe/types/";
                fetch_url += resOne[i];
                fetch_url += "/?datasource=tranquility&language=en-us";
                fetch(fetch_url)
                    .then(resTwo => {
                        if (resTwo.ok) {
                            return resTwo.json();
                        }
                        else { throw Error(resTwo.statusText) }
                    })
                    .then(resTwo => {
                        var pairing = {};
                        pairing.type_id = resOne[i];
                        pairing.name = resTwo.name;
                        var combo = pairing.type_id + " " + pairing.name + "\n";
                        fs.appendFile("pairings.txt", combo, function (err) {
                            if (err) {
                                return console.log(err);
                            }
                        });
                    })
                    .catch(err => {
                        console.log("===BEGIN ERROR MESSAGE===");
                        console.log(err);
                        var error_message = err.message + "\n";
                        fs.appendFile("errors.txt", error_message, function (err) {
                            if (err) {
                                return console.log(err);
                            }
                        });
                        var failed_id = resOne[i] + "\n";
                        // try to request  this type_id name again
                        error_retry(resOne[i]);
                        fs.appendFile("failed_type_ids.txt", failed_id, function (err) {
                            if (err) {
                                return console.log(err);
                            }
                        });
                        console.log("===End error message===");
                    });

            }
            console.log(`Fetched a page, waiting ${PAGES_DELAY} seconds...`);
            if (done === false) {
                setTimeout(recursive_data_fetcher, PAGES_DELAY * 1000);
            }

        })
        .catch(err => {
            // log this in its own file, since it means an entire page of type_id values wouldn't have been tried
            console.log(err);
            var error_message = err.message + "\n";
            fs.appendFile("majorerrorpagepull.txt", err.message, function (err) {
                if (err) {
                    return console.log(err);
                }
            });
        });
}

// Any time there's an HTTP error, try again
function error_retry(failed_id) {
    var fetch_url = "https://esi.tech.ccp.is/latest/universe/types/";
    fetch_url += failed_id;
    fetch_url += "/?datasource=tranquility&language=en-us";
    console.log("Trying to fix the error at " + fetch_url);
    fetch(fetch_url)
        .then(res => {
            if (res.ok) {
                return res.json();
            }
            else { throw Error(res.statusText) }
        })
        .then(res => {
            console.log(`@@@ CORRECTED AN ERROR ON TYPID ${failed_id}@@@`)
            var pairing = {};
            pairing.type_id = failed_id;
            pairing.name = res.name;
            var combo = pairing.type_id + " " + pairing.name + "\n";
            fs.appendFile("pairings.txt", combo, function (err) {
                if (err) {
                    return console.log(err);
                }
            });
            var fixed_id = pairing.type_id + "\n";
            fs.appendFile("fixederrors.txt", fixed_id, function (err) {
                if (err) {
                    return console.log(err);
                }
            });
        })
        .catch(err => {
            console.log("=== |RE-TRY| ERROR  ===");
            var error_message = "RETRY ERROR: " + err.message + "\n";
            fs.appendFile("errors.txt", error_message, function (err) {
                if (err) {
                    return console.log(err);
                }
            });
            // try again
            error_retry(failed_id);
        });

}