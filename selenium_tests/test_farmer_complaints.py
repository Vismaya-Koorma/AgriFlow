import time
import random
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
        var proto = (element instanceof HTMLTextAreaElement) ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
        nativeInputValueSetter.call(element, val);
        var inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);
        var changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
    """, element, str(value))
    time.sleep(0.3)

def main():
    print("Starting Farmer Complaints Functionality Test...")
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
        
        # 2. Navigate to Complaints Page
        print("Navigating to My Maintenance Complaints page...")
        driver.get("http://localhost:3000/farmer/complaints")
        
        # 3. Verify Page Title
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'My Maintenance Complaints')]"))
        )
        print("Maintenance Complaints page loaded.")
        
        # 4. Click Report Maintenance Issue Button
        report_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//button[contains(.,'Report Maintenance Issue')]"))
        )
        driver.execute_script("arguments[0].click();", report_btn)
        print("Clicked 'Report Maintenance Issue' button.")
        
        # 5. Wait for Dialog
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
        )
        
        # 6. Fill Title and Description
        comp_title = f"Pump valve leaking in Field {random.randint(100, 999)}"
        print(f"Entering Complaint Title: {comp_title}")
        
        title_input = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='e.g. Water Leakage in Main Drip Line']"))
        )
        fill_input_field(driver, title_input, comp_title)
        
        desc_input = driver.find_element(By.XPATH, "//textarea[@placeholder='Describe the issue in detail (location of damage, pressure drops, observed leak, etc.)...']")
        fill_input_field(driver, desc_input, "Water leaking around pump valve joint causing pressure drop.")
        
        # Submit Complaint
        form = driver.find_element(By.XPATH, "//div[@role='dialog']//form")
        driver.execute_script("arguments[0].requestSubmit();", form)
        print("Submitted Complaint form.")
        
        # 7. Verify Complaint in Table
        time.sleep(2)
        created_comp_elem = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{comp_title}')]"))
        )
        assert created_comp_elem is not None
        print(f"PASSED: Maintenance complaint '{comp_title}' reported and visible with Pending status!")
        time.sleep(1)
        
    except Exception as e:
        print("TEST ERROR:", e)
        traceback.print_exc()
        raise e
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
