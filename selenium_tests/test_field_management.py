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
        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(element, val);
        var inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);
        var changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
    """, element, str(value))
    time.sleep(0.3)

def main():
    print("Starting Field Management Functionality Test...")
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
        
        # 2. Ensure Farm Exists
        print("Navigating to My Farms page to ensure farm exists...")
        driver.get("http://localhost:3000/farmer/farms")
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//*[text()='My Farms']")))
        
        # Check if Add Farm button is present and click it to create a prerequisite farm if needed
        try:
            add_farm_btn = driver.find_element(By.XPATH, "//button[contains(.,'Add New Farm') or contains(.,'Add Farm')]")
            driver.execute_script("arguments[0].click();", add_farm_btn)
            time.sleep(1)
            
            farm_name_input = WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.NAME, "name")))
            fill_input_field(driver, farm_name_input, f"PrereqFarm_{random.randint(1000, 9999)}")
            
            loc_input = driver.find_element(By.NAME, "location")
            fill_input_field(driver, loc_input, "Kottayam")
            
            dist_input = driver.find_element(By.NAME, "district")
            fill_input_field(driver, dist_input, "Kottayam")
            
            area_input = driver.find_element(By.NAME, "total_area")
            fill_input_field(driver, area_input, "10.0")
            
            farm_form = driver.find_element(By.XPATH, "//div[@role='dialog']//form")
            driver.execute_script("arguments[0].requestSubmit();", farm_form)
            print("Prerequisite farm created/ensured.")
            time.sleep(2)
        except Exception as e:
            print("Farm already exists or created:", e)
        
        # 3. Navigate to Field Management Page
        print("Navigating to My Fields page...")
        driver.get("http://localhost:3000/farmer/fields")
        
        # 4. Verify My Fields page heading
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[text()='My Fields']"))
        )
        print("My Fields page loaded.")
        
        # 5. Click Add Field Button
        add_field_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(.,'Add Field')]"))
        )
        driver.execute_script("arguments[0].click();", add_field_btn)
        print("Clicked 'Add Field' button.")
        
        # 6. Wait for Dialog
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
        )
        
        # 7. Fill Field Details
        field_name = f"TestField_{random.randint(1000, 9999)}"
        print(f"Entering Field Name: {field_name}")
        
        name_input = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.NAME, "name"))
        )
        fill_input_field(driver, name_input, field_name)
        
        area_input = driver.find_element(By.NAME, "area")
        fill_input_field(driver, area_input, "4.5")
        
        planting_date_input = driver.find_element(By.NAME, "planting_date")
        fill_input_field(driver, planting_date_input, "2026-09-01")
        
        # Form Submit
        form = driver.find_element(By.XPATH, "//div[@role='dialog']//form")
        driver.execute_script("arguments[0].requestSubmit();", form)
        print("Submitted Field form via requestSubmit().")
        
        # 8. Wait for Dialog to close and field to appear in table
        time.sleep(2)
        created_field_elem = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{field_name}')]"))
        )
        assert created_field_elem is not None
        print(f"PASSED: Field '{field_name}' created and displayed in My Fields table!")
        time.sleep(2)
        
    except Exception as e:
        print("TEST ERROR:", e)
        traceback.print_exc()
        raise e
    finally:
        driver.quit()
        print("Test completed.")

if __name__ == "__main__":
    main()
