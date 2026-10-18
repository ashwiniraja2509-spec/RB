import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    print("Starting Playwright verification...")
    os.makedirs("test_results", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Test mobile viewport 390x844
        context = await browser.new_context(viewport={'width': 390, 'height': 844})
        page = await context.new_page()

        page.on('console', lambda msg: print(f"Console: [{msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: print(f"PageError: {err}"))

        await page.goto("http://localhost:8000/index.html")
        await page.wait_for_timeout(800)

        # 1. Screen 1: Welcome
        await page.screenshot(path="test_results/01_welcome.png")
        print("Captured 01_welcome.png")

        # Check scroll
        h_info = await page.evaluate('''() => {
            return {
                bodyScrollHeight: document.body.scrollHeight,
                bodyClientHeight: document.body.clientHeight,
                screensScrollHeight: document.getElementById('screensContainer').scrollHeight,
                screensClientHeight: document.getElementById('screensContainer').clientHeight
            }
        }''')
        print("Screen 1 Heights:", h_info)

        # 2. Click Start -> Screen 2: Name
        await page.click("#btnStartFlow")
        await page.wait_for_timeout(400)
        await page.screenshot(path="test_results/02_name.png")
        print("Captured 02_name.png")

        # Test empty validation
        await page.click("#btnNameNext")
        err_visible = await page.is_visible("#nameInputError")
        print("Name empty validation works:", err_visible)

        # Fill Name -> Screen 3: Phone
        await page.fill("#patientNameInput", "Priya Sharma")
        await page.click("#btnNameNext")
        await page.wait_for_timeout(400)
        await page.screenshot(path="test_results/03_phone.png")
        print("Captured 03_phone.png")

        # Test phone validation
        await page.fill("#patientPhoneInput", "12345")
        await page.click("#btnPhoneNext")
        phone_err = await page.is_visible("#phoneInputError")
        print("Phone validation error works:", phone_err)

        # Fill valid phone -> Screen 4: Rating
        await page.fill("#patientPhoneInput", "9876543210")
        await page.click("#btnPhoneNext")
        await page.wait_for_timeout(400)
        await page.screenshot(path="test_results/04_rating_unselected.png")
        print("Captured 04_rating_unselected.png")

        # Rate 5 stars
        await page.click('[data-star="5"]')
        await page.wait_for_timeout(200)
        label_text = await page.inner_text("#starLabelDisplay")
        print("Star 5 label text:", label_text)
        await page.screenshot(path="test_results/04_rating_selected.png")
        print("Captured 04_rating_selected.png")

        # Click Next -> Screen 5: Method Selection
        await page.click("#btnRatingNext")
        await page.wait_for_timeout(400)
        await page.screenshot(path="test_results/05_method.png")
        print("Captured 05_method.png")

        # Test Voice Screen 6A
        await page.click("#btnChooseVoice")
        await page.wait_for_timeout(400)
        await page.screenshot(path="test_results/06a_voice.png")
        print("Captured 06a_voice.png")

        # Go back to method screen
        await page.click("#btnBackFromVoice")
        await page.wait_for_timeout(400)

        # Test Text Screen 6B
        await page.click("#btnChooseText")
        await page.wait_for_timeout(400)
        await page.screenshot(path="test_results/06b_text.png")
        print("Captured 06b_text.png")

        # Fill feedback in Screen 6B
        await page.fill("#textFeedbackInput", "The doctors were very kind and listened patiently. The staff were helpful and the hospital was clean. However, the waiting time was a bit long.")
        await page.wait_for_timeout(200)
        char_text = await page.inner_text("#textCharCount")
        print("Text character count:", char_text)

        # Click Continue -> Screen 7: AI Review Preview
        await page.click("#btnTextContinue")
        await page.wait_for_timeout(4000)
        await page.screenshot(path="test_results/07_preview.png")
        print("Captured 07_preview.png")

        review_val = await page.input_value("#aiReviewEditText")
        print("AI Review Text in editor:", review_val[:80], "...")

        # Click Looks Good -> Screen 8: Success
        await page.click("#btnLooksGood")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="test_results/08_success.png")
        print("Captured 08_success.png")

        # Test Desktop Viewport
        print("Testing Desktop Viewport 1280x800...")
        d_context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        d_page = await d_context.new_page()
        await d_page.goto("http://localhost:8000/index.html")
        await d_page.wait_for_timeout(600)
        await d_page.screenshot(path="test_results/desktop_view.png")
        print("Captured desktop_view.png")

        # Test Small Viewports (360x800 and 375x812)
        for w, h in [(360, 800), (375, 812), (414, 896)]:
            sm_context = await browser.new_context(viewport={'width': w, 'height': h})
            sm_page = await sm_context.new_page()
            await sm_page.goto("http://localhost:8000/index.html")
            await sm_page.wait_for_timeout(400)
            await sm_page.screenshot(path=f"test_results/mobile_{w}x{h}.png")
            print(f"Captured mobile_{w}x{h}.png")

        await browser.close()
        print("Verification completely finished!")

if __name__ == "__main__":
    asyncio.run(run())
