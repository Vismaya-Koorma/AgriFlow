import time
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def fill_input(driver, element, value):
    """Set a React controlled input and verify that React accepted the value."""
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'});",
        element
    )

    WebDriverWait(driver, 10).until(
        EC.visibility_of(element)
    )

    WebDriverWait(driver, 10).until(
        lambda d: element.is_enabled()
    )

    driver.execute_script("""
        const element = arguments[0];
        const value = arguments[1];

        const nativeInputValueSetter =
            Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            ).set;

        nativeInputValueSetter.call(element, value);

        element.dispatchEvent(
            new Event('input', { bubbles: true })
        );

        element.dispatchEvent(
            new Event('change', { bubbles: true })
        );
    """, element, str(value))

    time.sleep(0.5)

    actual_value = element.get_attribute("value")

    print(f"Expected value: {value}")
    print(f"Actual input value: {actual_value}")

    if actual_value != str(value):
        raise AssertionError(
            f"Could not enter value into "
            f"{element.get_attribute('name')}: "
            f"expected '{value}', got '{actual_value}'"
        )

def main():
    print("Starting Farm Management Creation Test...")
    
    driver = webdriver.Chrome()
    farm_name = f"AgriFarm_{random.randint(1000, 9999)}"
    current_step = "Initializing browser"
    
    try:
        # 1. Login as Farmer
        current_step = "Logging in as farmer"
        print("Navigating to http://localhost:3000/login...")
        driver.get("http://localhost:3000/login")
        driver.maximize_window()
        
        driver.find_element(By.NAME, "username").send_keys("farmer")
        driver.find_element(By.NAME, "password").send_keys("farmer123")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        current_step = "Waiting for dashboard redirect after login"
        WebDriverWait(driver, 10).until(EC.url_to_be("http://localhost:3000/farmer"))
        
        # 2. Navigate to Farm Management
        current_step = "Navigating to http://localhost:3000/farmer/farms"
        print("Navigating to My Farms page...")
        driver.get("http://localhost:3000/farmer/farms")
        
        current_step = "Waiting for 'My Farms' heading on Farm Management page"
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//h6[contains(text(),'My Farms')]"))
        )
        time.sleep(1) # Allow page and initial API fetch to complete
        
        # 3. Click "Add Farm" button
        current_step = "Locating and clicking 'Add Farm' button"
        print("Clicking Add Farm button...")
        add_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//button[contains(.,'Add Farm')]"))
        )
        driver.execute_script("arguments[0].click();", add_btn)
        
        # 4. Wait for Add New Farm dialog to open
        current_step = "Waiting for Add New Farm dialog to open"
        print("Waiting for Add New Farm dialog to open...")
        dialog = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, "//div[@role='dialog']"))
        )
        assert dialog is not None
        time.sleep(1) # Short pause after dialog opens before filling fields
        
        # 5. Fill out input fields using native React value setter
        current_step = f"Filling form inputs for: {farm_name}"
        print(f"Creating new farm: {farm_name}...")
        
        print("\nFilling Farm Name...")
        name_input = driver.find_element(By.NAME, "name")
        fill_input(driver, name_input, farm_name)
        
        print("\nFilling Location...")
        loc_input = driver.find_element(By.NAME, "location")
        fill_input(driver, loc_input, "Alappuzha Region")
        
        print("\nFilling District...")
        dist_input = driver.find_element(By.NAME, "district")
        fill_input(driver, dist_input, "Alappuzha")
        
        print("\nFilling Total Area...")
        area_input = driver.find_element(By.NAME, "total_area")
        fill_input(driver, area_input, "14.50")
        
        # 6. Click Save button / Submit form
        current_step = "Submitting Save form"
        print("\nClicking Save button...")
        save_btn = driver.find_element(By.XPATH, "//div[@role='dialog']//button[@type='submit']")
        form_elem = driver.find_element(By.XPATH, "//div[@role='dialog']//form")
        
        try:
            save_btn.click()
        except Exception:
            pass
            
        driver.execute_script("arguments[0].requestSubmit();", form_elem)
        
        # 7. Wait for Add Farm dialog to close
        current_step = "Waiting for Add Farm dialog to close"
        print("Waiting for Add New Farm dialog to close...")
        WebDriverWait(driver, 10).until(
            EC.invisibility_of_element_located((By.XPATH, "//div[@role='dialog']"))
        )
        
        # 8. Wait for newly created farm to appear in farm list table
        current_step = f"Waiting for '{farm_name}' to appear in farm list"
        print(f"Waiting for '{farm_name}' to appear in farm list...")
        farm_cell = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, f"//td[contains(text(),'{farm_name}')]"))
        )
        
        # 9. Verify generated farm name text
        assert farm_name in farm_cell.text, f"Expected '{farm_name}' in cell text, got '{farm_cell.text}'"
        
        print("Farm Management Creation Test Passed.")
        time.sleep(3)
        
    except Exception as e:
        print(f"\n❌ FAILURE AT STEP: {current_step}")
        print(f"Current URL: {driver.current_url}")
        print(f"Page Title: {driver.title}")
        
        alert_msgs = driver.find_elements(By.XPATH, "//div[contains(@class,'MuiAlert-message')]")
        if alert_msgs:
            print(f"Alert Message on Failure: '{alert_msgs[0].text}'")
            
        print(f"Error Message: {e}")
        
        screenshot_path = "selenium_tests/farm_management_failure.png"
        try:
            driver.save_screenshot(screenshot_path)
            print(f"Screenshot saved to: {screenshot_path}")
        except Exception as ss_err:
            print(f"Failed to capture screenshot: {ss_err}")
            
        raise e
        
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
