import time
from selenium import webdriver

def main():
    print("Starting AgriFlow Frontend Open Test...")
    
    # Initialize Chrome WebDriver
    driver = webdriver.Chrome()
    
    try:
        # Navigate to local AgriFlow frontend server
        target_url = "http://localhost:3000/"
        print(f"Navigating to {target_url}...")
        driver.get(target_url)
        
        # Maximize browser window
        driver.maximize_window()
        
        print(f"Page title: '{driver.title}'")
        print("AgriFlow loaded successfully. Waiting for 5 seconds...")
        
        # Wait for 5 seconds
        time.sleep(5)
        
    finally:
        # Close browser and exit clean
        print("Closing browser...")
        driver.quit()
        print("Test completed successfully.")

if __name__ == "__main__":
    main()
