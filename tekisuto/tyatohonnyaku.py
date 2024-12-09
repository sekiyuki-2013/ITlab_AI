import google.generativeai as genai
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl
import socket
import urllib

# Google Gemini API設定
GOOGLE_API_KEY = "AIzaSyDpsq691VwEjgZluAGzEN8w7QsuyzsRhwo"
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
            q = params.get("q", [""])[0]  # テキスト入力値
            lang = params.get("lang", [""])[0]  # プルダウンメニューの値
            
            if lang and q:  # 両方が指定されている場合のみ処理
                prompt = f"「{q}」を{lang}に翻訳してください。説明文や余計な分は入れず、翻訳結果だけを表示してください。"
                response = model.generate_content(prompt)
                answer = f"<b>{response.text}</b>"
            else:
                answer = "<b>エラー: 入力または言語が指定されていません。</b>"
            
            self.wfile.write(answer.encode('utf-8'))

        else:
            super().do_GET()

# HTTPSサーバー設定
host = socket.gethostbyname(socket.gethostname())
port = 8000
httpd = HTTPServer((host, port), MyHandler)
httpd.socket = ssl.wrap_socket(httpd.socket, certfile='server.pem', server_side=True)
print(f'Ready! Access at https://{host}:{port}')
httpd.serve_forever()