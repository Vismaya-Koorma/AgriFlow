import time
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def main():
    print("Starting Full Farmer Registration Test...")
    
    driver = webdriver.Chrome()
    
    try:
        # Navigate to Register page
        register_url = "http://localhost:3000/register"
        print(f"Navigating to {register_url}...")
        driver.get(register_url)
        driver.maximize_window()
        
        # Generate unique test user credentials
        rand_id = random.randint(1000, 9999)
        test_username = f"farmer_{rand_id}"
        test_email = f"farmer_{rand_id}@agriflow.in"
        test_phone = f"98765{rand_id:05d}"[:10]
        
        print(f"Registering new test user: {test_username} ({test_email})...")
        
        # 1. Full Name
        driver.find_element(By.NAME, "fullName").send_keys("Test Farmer")
        
        # 2. Username
        driver.find_element(By.NAME, "username").send_keys(test_username)
        
        # 3. Email Address
        driver.find_element(By.NAME, "email").send_keys(test_email)
        
        # 4. Phone Number
        driver.find_element(By.NAME, "phoneNumber").send_keys(test_phone)
        
        # 5. District Select Dropdown (MUI Select)
        print("Selecting District...")
        # Locate the MUI Select container/combobox element
        district_trigger = driver.find_element(
            By.XPATH,
            "//label[contains(text(),'District')]/following-sibling::div[contains(@class,'MuiInputBase-root')]"
        )
        district_trigger.click()
        time.sleep(0.5)
        
        # Select 'Alappuzha' from popover list
        option = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//li[contains(text(),'Alappuzha')]"))
        )
        option.click()
        
        # 6. Password
        driver.find_element(By.NAME, "password").send_keys("FarmerPass123!")
        
        # 7. Confirm Password
        driver.find_element(By.NAME, "confirmPassword").send_keys("FarmerPass123!")
        
        # 8. Accept Terms & Conditions Checkbox
        print("Checking Terms & Conditions checkbox...")
        terms_checkbox = driver.find_element(By.NAME, "termsAccepted")
        if not terms_checkbox.is_selected():
            driver.execute_script("arguments[0].click();", terms_checkbox)
            
        # 9. Submit Form
        print("Submitting registration form...")
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_btn.click()
        
        # 10. Wait for redirection to /login
        print("Waiting for redirection to /login...")
        WebDriverWait(driver, 10).until(EC.url_to_be("http://localhost:3000/login"))
        
        print(f"Registration successful! New user '{test_username}' created.")
        print("Full registration test passed.")
        time.sleep(3)
        
    finally:
        driver.quit()
        print("Test completed.")

if __name__ == "__main__":
    main()
