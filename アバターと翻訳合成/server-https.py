import urllib
from http.server import HTTPServer, SimpleHTTPRequestHandler
import google.generativeai as genai
import os
import ssl
import socket
import urllib
import json

# Google Gemini API設定
#GOOGLE_API_KEYに自分のAPIキーを入力してください！
GOOGLE_API_KEY = "YOUR_API_KEY"
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

class MyHandler(SimpleHTTPRequestHandler):
    def htmlheader(self):  # HTTPヘッダーを出力
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.endswith('favicon.ico'):
            return

        p = urllib.parse.urlparse(self.path)
        if p.path == "/send":
            self.htmlheader()
            params = urllib.parse.parse_qs(p.query)
            q = params.get("q", [""])[0]  # 翻訳するテキスト
            l_list = json.loads(params.get("l_list", ["[]"])[0])  # 言語リストをJSON形式でデコード

            translations = []
            for lang in l_list:
                prompt = f"「{q}」を{lang}に翻訳してください。説明文や余計な文は入れず、翻訳結果だけを表示してください。"
                response = model.generate_content(prompt)
                translations.append(f"{lang}: {response.text}")

            result = "<br>".join(translations)  # 各言語の翻訳結果を連結
            self.wfile.write(result.encode('utf-8'))
        else:
            super().do_GET()

# HTTPSサーバー設定
host = socket.gethostbyname(socket.gethostname())
port = 8000
httpd = HTTPServer((host, port), MyHandler)
httpd.socket = ssl.wrap_socket(httpd.socket, certfile='server.pem', server_side=True)
print(f'Ready! Access at https://{host}:{port}')
httpd.serve_forever()
