import time
from selenium import webdriver

def main():
    print("Starting Selenium Chrome browser test...")
    
    # Initialize the Chrome WebDriver (Selenium 4 automatically manages ChromeDriver)
    driver = webdriver.Chrome()
    
    try:
        # Navigate to Google
        print("Navigating to https://www.google.com...")
        driver.get("https://www.google.com")
        
        # Maximize the browser window
        driver.maximize_window()
        print(f"Page title: '{driver.title}'")
        print("Browser maximized. Waiting for 5 seconds...")
        
        # Wait for 5 seconds
        time.sleep(5)
        
    finally:
        # Close all browser windows and safely terminate the WebDriver session
        print("Closing browser...")
        driver.quit()
        print("Test completed successfully.")

if __name__ == "__main__":
    main()
