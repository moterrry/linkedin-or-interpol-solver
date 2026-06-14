// ==UserScript==
// @name         linkedin or interpol solver
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  cheat
// @author       moterrry
// @match        *://linkedin-or-interpol.com/*
// @match        *://www.linkedin-or-interpol.com/*
// @match        *://interpol.thebrainfox.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // inject custom styles for the dot indicator
    const style = document.createElement('style');
    style.textContent = `
        #cheat-dot {
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            z-index: 9999999;
            background-color: transparent;
            border: 2px solid #ffffff;
            box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
            transition: background-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
            pointer-events: auto;
            cursor: help;
        }
        #cheat-dot.pulsing {
            animation: cheat-pulse 1.5s infinite;
        }
        @keyframes cheat-pulse {
            0% {
                box-shadow: 0 0 0 0px var(--pulse-color, rgba(255, 255, 255, 0.7)), 0 0 8px rgba(0, 0, 0, 0.5);
            }
            70% {
                box-shadow: 0 0 0 10px rgba(0, 0, 0, 0), 0 0 8px rgba(0, 0, 0, 0.5);
            }
            100% {
                box-shadow: 0 0 0 0px rgba(0, 0, 0, 0), 0 0 8px rgba(0, 0, 0, 0.5);
            }
        }
    `;
    document.documentElement.appendChild(style);

    // create the dot element
    const dot = document.createElement('div');
    dot.id = 'cheat-dot';
    dot.title = 'LinkedIn or Interpol Helper (Waiting for person)';

    // wait for the body element to append the dot cleanly
    const observer = new MutationObserver(() => {
        if (document.body && !document.getElementById('cheat-dot')) {
            document.body.appendChild(dot);
            observer.disconnect();
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // helper functions to manage the dot state
    function updateDot(type) {
        if (type === 'linkedin') {
            dot.style.backgroundColor = '#4caf50'; // Green
            dot.style.setProperty('--pulse-color', 'rgba(76, 175, 80, 0.6)');
            dot.classList.add('pulsing');
            dot.title = 'Answer: LinkedIn';
        } else if (type === 'interpol') {
            dot.style.backgroundColor = '#f44336'; // Red
            dot.style.setProperty('--pulse-color', 'rgba(244, 67, 54, 0.6)');
            dot.classList.add('pulsing');
            dot.title = 'Answer: Interpol';
        }

        // trigger a tiny pop effect
        dot.style.transform = 'scale(1.2)';
        setTimeout(() => {
            dot.style.transform = 'scale(1)';
        }, 150);
    }

    function clearDot() {
        dot.style.backgroundColor = 'transparent';
        dot.classList.remove('pulsing');
        dot.title = 'LinkedIn or Interpol Helper (Loading next)';
    }

    // intercept global fetch calls
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0];
        const urlString = (typeof url === 'string') ? url : (url && url.url) ? url.url : '';

        // check if the request is for loading a random person
        if (urlString.includes('/api/random-person')) {
            clearDot();
            const response = await originalFetch(...args);

            // clone the response so the page can read it normally
            const clonedResponse = response.clone();
            try {
                const data = await clonedResponse.json();
                handleNewPerson(data);
            } catch (e) {
                console.error('[Solver] Error decoding API response:', e);
            }
            return response;
        }

        return originalFetch(...args);
    };

    // process the new person to determine and display the correct answer
    async function handleNewPerson(person) {
        if (!person) return;

        // strategy 1: check if the type is explicitly present in the random person response
        if (person.type) {
            updateDot(person.type.toLowerCase());
            return;
        }

        // strategy 2: check if the photo URL has the classification
        if (person.photoUrl) {
            const lowerUrl = person.photoUrl.toLowerCase();
            if (lowerUrl.includes('linkedin')) {
                updateDot('linkedin');
                return;
            } else if (lowerUrl.includes('interpol')) {
                updateDot('interpol');
                return;
            }
        }

        // strategy 3: fallback query via the check-answer API (completely side-effect free)
        if (person.id) {
            try {
                const checkRes = await originalFetch('/api/check-answer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        personId: person.id,
                        userChoice: 'linkedin' // guess LinkedIn to see if correct
                    })
                });

                if (checkRes.ok) {
                    const result = await checkRes.json();
                    if (result.correct) {
                        updateDot('linkedin');
                    } else {
                        updateDot('interpol');
                    }
                }
            } catch (err) {
                console.error('[Solver] Failed to fetch check-answer status:', err);
            }
        }
    }
})();
