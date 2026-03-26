import requests
import time

api_key = "rd_5c48624790b8f77b_983f08dee1e2a47538da4eab9212eb78"
headers = {"x-api-key": api_key, "Content-Type": "application/json"}

res = requests.post("https://api.prd.realitydefender.xyz/api/files/aws-presigned", json={"fileName": "voterdemo.jpg"}, headers=headers)
data = res.json()

req_id = data.get("requestId")
signed_url = data.get("response", {}).get("signedUrl")

content = open("uploads/voterdemo.jpg", "rb").read()
requests.put(signed_url, data=content)

for i in range(10):
    time.sleep(3)
    res3 = requests.get(f"https://api.prd.realitydefender.xyz/api/media/users/{req_id}", headers={"x-api-key": api_key})
    print("POLL ENDPOINT:", res3.status_code, res3.json())
    if res3.json().get("response", {}).get("status") != "ANALYZING":
        break
