import os
import sys
import time
import urllib.request

URL = "https://files.pythonhosted.org/packages/9a/1e/a5475c00b0555e686333e6b4036f2213e7cbea021a772ce6f9ced4dcbd2f/torch-2.14.0-cp314-cp314-win_amd64.whl"
OUT_FILE = "torch-2.14.0-cp314-cp314-win_amd64.whl"


def download_with_resume(url, target_path):
    print(f"Downloading with resume: {url}")
    
    downloaded_bytes = 0
    if os.path.exists(target_path):
        downloaded_bytes = os.path.getsize(target_path)

    # Get total size first
    req_head = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req_head) as resp:
        total_size = int(resp.info().get('Content-Length', 0))

    if downloaded_bytes >= total_size and total_size > 0:
        print(f"[OK] File already complete: {downloaded_bytes} / {total_size} bytes")
        return

    chunk_size = 512 * 1024  # 512KB chunks for stability

    while downloaded_bytes < total_size or total_size == 0:
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0',
                'Range': f'bytes={downloaded_bytes}-'
            })
            with urllib.request.urlopen(req, timeout=15) as response, open(target_path, 'ab') as out_file:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    out_file.flush()
                    downloaded_bytes += len(chunk)
                    pct = (downloaded_bytes / float(total_size) * 100) if total_size > 0 else 0
                    sys.stdout.write(f"\rDownloaded: {downloaded_bytes / (1024*1024):.1f} MB / {total_size / (1024*1024):.1f} MB ({pct:.1f}%)")
                    sys.stdout.flush()
        except Exception as e:
            print(f"\nConnection drop at {downloaded_bytes / (1024*1024):.1f} MB ({e}). Retrying in 2s...")
            time.sleep(2)
            downloaded_bytes = os.path.getsize(target_path) if os.path.exists(target_path) else 0

    print("\n[OK] Download complete:", target_path)


if __name__ == "__main__":
    download_with_resume(URL, OUT_FILE)
