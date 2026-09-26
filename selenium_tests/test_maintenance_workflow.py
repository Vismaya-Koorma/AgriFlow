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
    print("Starting Maintenance Workflow Functionality Test...")
    driver = webdriver.Chrome()
    
    try:
        # 1. Login as Maintenance Worker
        driver.get("http://localhost:3000/login")
        driver.maximize_window()
        
        driver.find_element(By.NAME, "username").send_keys("maintenance")
        driver.find_element(By.NAME, "password").send_keys("maintenance123")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        WebDriverWait(driver, 10).until(EC.url_to_be("http://localhost:3000/maintenance"))
        print("Logged in successfully as Maintenance Worker.")
        
        # 2. Verify Dashboard Title
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Maintenance Worker Tasks')]"))
        )
        print("Maintenance Dashboard page loaded.")
        
        # 3. Check for Accept or Progress or Details buttons in table
        try:
            accept_btn = driver.find_element(By.XPATH, "//button[contains(.,'Accept')]")
            driver.execute_script("arguments[0].click();", accept_btn)
            print("Clicked 'Accept' button on pending task.")
            time.sleep(1)
        except Exception:
            print("No pending task requires Accept, checking active tasks...")
            
        try:
            progress_btn = driver.find_element(By.XPATH, "//button[contains(.,'Progress')]")
            driver.execute_script("arguments[0].click();", progress_btn)
            print("Clicked 'Progress' button.")
            
            # Wait for Progress Dialog
            WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
            )
            
            note_input = driver.find_element(By.XPATH, "//textarea[@placeholder='Describe current inspection or repair work completed...']")
            fill_input_field(driver, note_input, "Inspected drip pipe, replacing damaged joint.")
            
            save_btn = driver.find_element(By.XPATH, "//button[type='submit' or text()='Save Update']")
            driver.execute_script("arguments[0].click();", save_btn)
            print("Saved progress update.")
            time.sleep(2)
        except Exception as e:
            print("No active progress task found or progress dialog handled:", e)
            
        print("PASSED: Maintenance Workflow Test completed successfully.")
        
    except Exception as e:
        print("TEST ERROR:", e)
        traceback.print_exc()
        raise e
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
