import requests
api_key = "rd_5c48624790b8f77b_983f08dee1e2a47538da4eab9212eb78"
headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
try:
    print("Requesting Signed S3 URL...")
    res = requests.post("https://api.prd.realitydefender.xyz/v1/media/signedUrl", json={"fileName": "voterdemo.jpg"}, headers=headers)
    print("S3 BUCKET:", res.status_code, res.text)
except Exception as e:
    print("ERR:", e)
