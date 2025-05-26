import { browser } from 'k6/browser';

const flows = {
    viewProduct: async (page) => {
        console.log('[viewProduct] Navigating to home page');
        await page.goto('http://localhost:8000');
        await page.waitForSelector('#products');

        const visitCount = Math.floor(Math.random() * 3) + 3; // 3–5 visits
        console.log(`[viewProduct] Will visit ${visitCount} products`);

        for (let i = 0; i < visitCount; i++) {
            const productCards = await page.$$('.product-card');
            if (productCards.length === 0) return;

            const randomIndex = Math.floor(Math.random() * productCards.length);
            const selectedCard = productCards[randomIndex];

            console.log(`[viewProduct] Visiting product ${randomIndex + 1} of ${productCards.length}`);
            await selectedCard.click();
            await page.waitForTimeout((Math.floor(Math.random() * 5) + 1) * 1000);
            console.log('[viewProduct] Going back to products list');
            await page.goBack();
            await page.waitForSelector('#products');
        }
    },
    addToCart: async (page) => {
        console.log('[addToCart] Navigating to home page');
        await page.goto('http://localhost:8000');
        await page.waitForSelector('#products');

        const attempts = Math.floor(Math.random() * 3) + 1; // 1–3 attempts
        console.log(`[addToCart] Will attempt to add to cart ${attempts} times`);

        for (let i = 0; i < attempts; i++) {
            const productCards = await page.$$('.product-card');
            if (productCards.length === 0) return;

            const randomIndex = Math.floor(Math.random() * productCards.length);
            const selectedCard = productCards[randomIndex];

            console.log(`[addToCart] Selecting product ${randomIndex + 1} of ${productCards.length}`);
            await selectedCard.click();
            await page.waitForSelector('#add-to-cart-button');

            // Random size
            const sizeButtons = await page.$$('#size-radio-group [role="radio"]');
            if (sizeButtons.length > 0) {
                const randomSizeIndex = Math.floor(Math.random() * sizeButtons.length);
                console.log(`[addToCart] Selecting size ${randomSizeIndex + 1} of ${sizeButtons.length}`);
                await sizeButtons[randomSizeIndex].click();
            }

            // Random color
            const colorButtons = await page.$$('#color-radio-group [role="radio"]');
            if (colorButtons.length > 0) {
                const randomColorIndex = Math.floor(Math.random() * colorButtons.length);
                console.log(`[addToCart] Selecting color ${randomColorIndex + 1} of ${colorButtons.length}`);
                await colorButtons[randomColorIndex].click();
            }

            // Random quantity (0–3 increments)
            const quantityClicks = Math.floor(Math.random() * 4);
            for (let j = 0; j < quantityClicks; j++) {
                console.log(`[addToCart] Incrementing quantity (${j + 1}/${quantityClicks})`);
                await page.locator('#increment-quantitMarcy-button').click();
            }

            try {
                console.log('[addToCart] Clicking add to cart');
                await page.locator('#add-to-cart-button').click();
                await page.waitForTimeout(1000);
            } catch (err) {
                console.error(`Add to cart failed: ${err.message}`);
            }

            console.log('[addToCart] Going back to products list');
            await page.goBack();
            await page.waitForSelector('#products');
        }
    },
    checkout: async (page) => {
        console.log('[checkout] Navigating to home page');
        await page.goto('http://localhost:8000');
        await page.waitForSelector('#products');
        console.log('[checkout] Waiting for products');

        const productCards = await page.$$('.product-card');
        if (productCards.length === 0) {
            console.log('[checkout] No products found');
            return;
        } else {
            console.log(`[checkout] ${productCards.length} Products found`);
        }

        const randomIndex = Math.floor(Math.random() * productCards.length);
        const selectedCard = productCards[randomIndex];

        console.log(`[checkout] Selecting product ${randomIndex + 1} of ${productCards.length}`);
        await selectedCard.click();
        await page.waitForSelector('#add-to-cart-button');

        const sizeButtons = await page.$$('#size-radio-group [role="radio"]');
        if (sizeButtons.length > 0) {
            const randomSizeIndex = Math.floor(Math.random() * sizeButtons.length);
            console.log(`[checkout] Selecting size ${randomSizeIndex + 1} of ${sizeButtons.length}`);
            if (sizeButtons[randomSizeIndex]) {
                const sizeId = await sizeButtons[randomSizeIndex].getAttribute('id');
                const label = await page.$(`label[for="${sizeId}"]`);
                if (label) {
                    console.log(`[checkout] Clicking label for sizeButton[${randomSizeIndex}]`);
                    await label.click();
                } else {
                    console.log(`[checkout] No label found for sizeButton[${randomSizeIndex}] with id ${sizeId}, falling back to button click.`);
                    await sizeButtons[randomSizeIndex].click();
                }
            } else {
                console.log(`[checkout] sizeButtons[${randomSizeIndex}] is undefined!`);
            }
        } else {
            console.log('[checkout] No size buttons found');
        }

        const colorButtons = await page.$$('#color-radio-group [role="radio"]');
        console.log(`[checkout] colorButtons.length: ${colorButtons.length}`);
        if (colorButtons.length > 0) {
            const randomColorIndex = Math.floor(Math.random() * colorButtons.length);
            console.log(`[checkout] Selecting color ${randomColorIndex + 1} of ${colorButtons.length}`);
            if (colorButtons[randomColorIndex]) {
                const colorId = await colorButtons[randomColorIndex].getAttribute('id');
                const label = await page.$(`label[for="${colorId}"]`);
                if (label) {
                    console.log(`[checkout] Clicking label for colorButton[${randomColorIndex}]`);
                    await label.click();
                } else {
                    console.log(`[checkout] No label found for colorButton[${randomColorIndex}] with id ${colorId}, falling back to button click.`);
                    await colorButtons[randomColorIndex].click();
                }
            } else {
                console.log(`[checkout] colorButtons[${randomColorIndex}] is undefined!`);
            }
        } else {
            console.log('[checkout] No color buttons found');
        }

        const quantityClicks = Math.floor(Math.random() * 4);
        for (let j = 0; j < quantityClicks; j++) {
            console.log(`[checkout] Incrementing quantity (${j + 1}/${quantityClicks})`);
            await page.locator('#increment-quantity-button').click();
        }

        try {
            console.log('[checkout] Clicking add to cart');
            await page.locator('#add-to-cart-button').click();
            await page.waitForTimeout(1000);

            // Open cart and proceed to checkout
            console.log('[checkout] Opening cart');
            await page.locator('#cart-button').click();
            await page.waitForSelector('a[href="/checkout"]');
            console.log('[checkout] Navigating to checkout page');
            await Promise.all([page.waitForNavigation(), page.locator('a[href="/checkout"]').click()]);
            console.log('[checkout] Current URL after navigation:', page.url());

            // Handle login flow if prompted
            const loginButton = await page.$('#login-button');
            if (loginButton) {
                console.log('[checkout] Login required, clicking login');
                await loginButton.click();
                console.log('[checkout] Clicked login button, waiting for submit login button...');
                await page.waitForSelector('#login-dialog-button', { timeout: 5000 });
                const submitLoginButton = await page.$('#login-dialog-button');
                if (submitLoginButton) {
                    let isVisible = true;
                    if (submitLoginButton.isVisible) {
                        try {
                            isVisible = await submitLoginButton.isVisible();
                        } catch {
                            isVisible = true;
                        }
                    }
                    let isDisabled = false;
                    if (submitLoginButton.getAttribute) {
                        try {
                            isDisabled = (await submitLoginButton.getAttribute('disabled')) !== null;
                        } catch {
                            isDisabled = false;
                        }
                    }
                    console.log(`[checkout] Submit login button found. Visible: ${isVisible}, Disabled: ${isDisabled}`);
                    if (isVisible && !isDisabled) {
                        console.log('[checkout] Clicking submit login button');
                        await submitLoginButton.click();
                        console.log('[checkout] Clicked submit login button');
                    } else {
                        console.error('[checkout] Submit login button is not visible or is disabled!');
                    }
                } else {
                    console.error('[checkout] Submit login button not found!');
                }
            }

            // Debug: targeted checkout button state and fallback logging
            const checkoutButton = await page.$('#checkout');
            if (checkoutButton) {
                // Check visibility and disabled state
                let isVisible = true;
                if (checkoutButton.isVisible) {
                    try {
                        isVisible = await checkoutButton.isVisible();
                    } catch {
                        isVisible = true;
                    }
                }
                let isDisabled = false;
                if (checkoutButton.getAttribute) {
                    try {
                        isDisabled = (await checkoutButton.getAttribute('disabled')) !== null;
                    } catch {
                        isDisabled = false;
                    }
                }
                console.log(`[checkout] #checkout button found. Visible: ${isVisible}, Disabled: ${isDisabled}`);
                if (isVisible) {
                    // Wait for the button to become enabled
                    const maxWaitMs = 10000;
                    const pollInterval = 200;
                    let waited = 0;
                    while (isDisabled && waited < maxWaitMs) {
                        await new Promise((res) => setTimeout(res, pollInterval));
                        waited += pollInterval;
                        if (checkoutButton.getAttribute) {
                            try {
                                isDisabled = (await checkoutButton.getAttribute('disabled')) !== null;
                            } catch {
                                isDisabled = false;
                            }
                        }
                        if (!isDisabled) {
                            console.log('[checkout] #checkout button is now enabled!');
                            break;
                        }
                    }
                    if (isDisabled) {
                        console.error('[checkout] #checkout button did not become enabled in time!');
                    } else {
                        await page.waitForSelector('#checkout', { timeout: 5000 });
                        console.log('[checkout] Clicking final checkout button');
                        await checkoutButton.click();
                    }
                } else {
                    console.error('[checkout] #checkout button is not visible!');
                }
            } else {
                console.error('[checkout] #checkout button not found on the page! Listing all buttons:');
                const allButtons = await page.$$('button');
                for (let i = 0; i < allButtons.length; i++) {
                    const text = await allButtons[i].evaluate((el) => el.textContent);
                    const id = await allButtons[i].getAttribute('id');
                    console.log(`[checkout] Button ${i}: id="${id}", text="${text && text.trim()}"`);
                }
            }
        } catch (err) {
            console.error(`Checkout flow failed: ${err.message}`);
        }
    },
};

function randomStages(durationMinutes = 45, minVUs = 5, maxVUs = 10, steps = 5) {
    const stages = [];
    const stepDuration = Math.floor((durationMinutes * 60) / steps);
    for (let i = 0; i < steps; i++) {
        const vus = Math.floor(Math.random() * (maxVUs - minVUs + 1)) + minVUs;
        stages.push({ duration: `${stepDuration}s`, target: vus });
    }
    return stages;
}

export const options = {
    scenarios: {
        browser_test: {
            executor: 'ramping-vus',
            gracefulStop: '30s',
            startVUs: 1,
            stages: randomStages(30, 10, 15, 5), // 15 minutes, 5 stages, 5-10 VUs
            options: {
                browser: {
                    type: 'chromium',
                },
            },
        },
    },
};

export default async function () {
    let page;
    try {
        page = await browser.newPage();
        const randomFlow = flows.checkout; //getRandomFlow();
        await randomFlow(page);
    } catch (error) {
        console.error(error);
    } finally {
        if (page) {
            await page.close();
        }
    }
}
