import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def main():
    print("Starting User Logout Flow Test...")
    
    # 1. Open Chrome browser
    driver = webdriver.Chrome()
    
    try:
        # 2. Navigate to AgriFlow login page
        login_url = "http://localhost:3000/login"
        print(f"Navigating to {login_url}...")
        driver.get(login_url)
        
        # 3. Maximize browser window
        driver.maximize_window()
        
        # 4. Login with valid farmer credentials
        print("Logging in as farmer...")
        driver.find_element(By.NAME, "username").send_keys("farmer")
        driver.find_element(By.NAME, "password").send_keys("farmer123")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        # 5. Wait for redirection to Farmer Dashboard
        dashboard_url = "http://localhost:3000/farmer"
        print(f"Waiting for dashboard {dashboard_url}...")
        WebDriverWait(driver, 10).until(EC.url_to_be(dashboard_url))
        print("Successfully logged in.")
        
        # 6. Locate and click Logout button in Sidebar
        print("Locating and clicking Logout button...")
        logout_button = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//span[text()='Logout'] | //*[text()='Logout']"))
        )
        driver.execute_script("arguments[0].click();", logout_button)
        
        # 7. Wait for redirection back to /login (verify username input appears on login page)
        print("Waiting for redirection back to login page...")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "username"))
        )
        
        current_url = driver.current_url
        assert "/login" in current_url, f"Expected '/login' in URL, but got {current_url}"
        print(f"Successfully logged out. Current URL: {current_url}")
        print("Logout test passed.")
        
        time.sleep(2)
        
    finally:
        # Close browser cleanly
        print("Closing browser...")
        driver.quit()
        print("Test run completed.")

if __name__ == "__main__":
    main()
