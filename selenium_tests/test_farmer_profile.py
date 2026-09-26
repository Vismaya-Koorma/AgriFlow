import time
import traceback
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def fill_input_field(driver, element, value):
    """Fill input using native value setter and events for React compatibility."""
    driver.execute_script("""
        var element = arguments[0];
        var val = arguments[1];
        element.focus();
        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(element, val);
        var inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);
        var changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
    """, element, str(value))
    time.sleep(0.3)

def main():
    print("Starting Farmer Profile Functionality Test...")
    driver = webdriver.Chrome()
    
    try:
        # 1. Login as Farmer
        driver.get("http://localhost:3000/login")
        driver.maximize_window()
        
        driver.find_element(By.NAME, "username").send_keys("farmer")
        driver.find_element(By.NAME, "password").send_keys("farmer123")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        WebDriverWait(driver, 10).until(EC.url_to_be("http://localhost:3000/farmer"))
        print("Logged in successfully as Farmer.")
        
        # 2. Navigate to Profile Page
        print("Navigating to Profile page...")
        driver.get("http://localhost:3000/farmer/profile")
        
        # 3. Verify Profile Card Title
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[text()='Profile Information']"))
        )
        print("Profile Information page loaded.")
        
        # 4. Fill Phone Number, District, and State
        phone_input = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.NAME, "phone_number"))
        )
        fill_input_field(driver, phone_input, "9876543210")
        
        district_input = driver.find_element(By.NAME, "district")
        fill_input_field(driver, district_input, "Kottayam")
        
        state_input = driver.find_element(By.NAME, "state")
        fill_input_field(driver, state_input, "Kerala")
        
        # 5. Submit Form
        update_btn = driver.find_element(By.XPATH, "//button[contains(.,'Update Profile')]")
        driver.execute_script("arguments[0].click();", update_btn)
        print("Clicked 'Update Profile' button.")
        
        # 6. Verify Snackbar Success Message
        snackbar = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Profile updated successfully')]"))
        )
        assert snackbar is not None
        print("PASSED: Profile updated successfully and verified via Snackbar notice!")
        time.sleep(1)
        
    except Exception as e:
        print("TEST ERROR:", e)
        traceback.print_exc()
        raise e
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
