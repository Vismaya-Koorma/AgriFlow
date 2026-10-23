import os
import sys
import time
import traceback

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Ensure Python path includes AgriFlow project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def get_chrome_driver():
    options = Options()
    options.add_argument("--remote-allow-origins=*")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    return webdriver.Chrome(options=options)

def ensure_active_complaint():
    """Ensure at least one active/pending complaint exists for the maintenance worker."""
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
        import django
        django.setup()
        from maintenance.models import Complaint
        from accounts.models import User
        from farms.models import Farm, Field

        worker = User.objects.filter(role=User.Role.MAINTENANCE, username='maintenance').first()
        if not worker:
            worker = User.objects.filter(role=User.Role.MAINTENANCE).first()

        active = Complaint.objects.filter(
            assigned_to=worker,
            status__in=[Complaint.Status.PENDING, Complaint.Status.ACCEPTED, Complaint.Status.IN_PROGRESS]
        ).first()

        if not active:
            farmer = User.objects.filter(role=User.Role.FARMER).first()
            farm = Farm.objects.filter(owner=farmer).first() if farmer else Farm.objects.first()
            field = Field.objects.filter(farm=farm).first() if farm else Field.objects.first()
            new_complaint = Complaint.objects.create(
                submitted_by=farmer,
                assigned_to=worker,
                farm=farm,
                field=field,
                title="Drip Irrigation Line Pressure Issue",
                description="Pressure dropped in main irrigation pipe requiring joint inspection.",
                category=Complaint.Category.DRIP,
                priority=Complaint.Priority.HIGH,
                status=Complaint.Status.ACCEPTED,
                progress=30
            )
            print(f"Created prerequisite active complaint: {new_complaint.complaint_id}")
        else:
            print(f"Found active complaint ready for work completion: {active.complaint_id} (Status: {active.status})")
    except Exception as e:
        print("Note on prerequisite check:", e)

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
    print("Starting Maintenance Worker Add Completion of Work Test...")
    ensure_active_complaint()
    driver = get_chrome_driver()
    
    try:
        # 1. Login as Maintenance Worker
        print("Navigating to Login page...")
        driver.get("http://localhost:3000/login")
        driver.maximize_window()
        
        user_input = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.NAME, "username")))
        user_input.send_keys("maintenance")
        driver.find_element(By.NAME, "password").send_keys("maintenance123")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        WebDriverWait(driver, 10).until(EC.url_to_be("http://localhost:3000/maintenance"))
        print("Logged in successfully as Maintenance Worker.")
        
        # 2. Verify Dashboard Title
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Maintenance Worker Tasks')]"))
        )
        print("Maintenance Dashboard page loaded.")
        
        # 3. Wait for Tasks Table to Load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//table//tbody//tr"))
        )
        time.sleep(1)
        
        # 4. If any task is pending and has Accept button, accept it or find active task
        complete_btn = None
        complete_buttons = driver.find_elements(By.XPATH, "//table//tbody//tr//button[normalize-space(.)='Complete']")
        
        if not complete_buttons:
            # Check for Accept button to activate pending task
            accept_buttons = driver.find_elements(By.XPATH, "//table//tbody//tr//button[normalize-space(.)='Accept']")
            if accept_buttons:
                print("Accepting pending task...")
                driver.execute_script("arguments[0].click();", accept_buttons[0])
                time.sleep(2)
                complete_buttons = driver.find_elements(By.XPATH, "//table//tbody//tr//button[normalize-space(.)='Complete']")

        if complete_buttons:
            complete_btn = complete_buttons[0]
        else:
            raise Exception("No active task available with 'Complete' action button!")

        # 5. Click 'Complete' action button in table
        print("Clicking 'Complete' action button in table...")
        driver.execute_script("arguments[0].click();", complete_btn)
        
        # 6. Wait for 'Mark Task Completed' Dialog
        dialog = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
        )
        print("Completion dialog opened.")
        
        # 7. Add Completion Notes
        notes_textarea = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']//textarea"))
        )
        completion_text = "Valve repaired, seals replaced, and pressure test passed successfully. Maintenance work 100% completed."
        fill_input_field(driver, notes_textarea, completion_text)
        print(f"Entered completion notes: '{completion_text}'")
        
        # 8. Submit Completion Form
        submit_btn = driver.find_element(By.XPATH, "//div[@role='dialog']//button[contains(.,'Mark Completed')]")
        driver.execute_script("arguments[0].click();", submit_btn)
        print("Submitted completion of work.")
        
        # 9. Verify Success Alert
        success_alert = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'marked as completed')]"))
        )
        assert success_alert is not None
        print(f"Success Alert Confirmed: '{success_alert.text}'")
        
        # 10. Switch to 'Completed' Tab and verify completed tasks appear
        completed_tab = driver.find_element(By.XPATH, "//button[@role='tab' and contains(.,'Completed')]")
        driver.execute_script("arguments[0].click();", completed_tab)
        time.sleep(1.5)
        
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//table//tbody//tr"))
        )
        print("Verified completed tasks in Completed tab.")
        
        print("PASSED: Maintenance Worker successfully added completion of work!")
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
