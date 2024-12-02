import google.generativeai as genai
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl
import socket
import urllib

# Google API設定
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=GOOGLE_API_KEY)

class MyHandler(SimpleHTTPRequestHandler):
    def htmlheader(self):  # HTTPヘッダーを送信
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.end_headers()

    def do_GET(self):
        if self.path.endswith('favicon.ico'):
            return

        p = urllib.parse.urlparse(self.path)

        if p.path == "/send":
            self.htmlheader()
            params = urllib.parse.parse_qs(p.query)
            q = params.get("q", [""])[0]  # 翻訳するテキスト
            target_language = params.get("target_language", ["English"])[0]  # 翻訳先言語

            if not q:
                self.wfile.write("翻訳するテキストを入力してください。".encode('utf-8'))
                return

            # Geminiモデルを使って翻訳処理
            prompt = f"Translate the following text into {target_language}:\n\n{q}"
            try:
                # 直接API呼び出し
                response = genai.generate_text(prompt=prompt)
                translation = response.generations[0]["text"].strip()  # Geminiモデルからの翻訳結果
                print(f"Original: {q}, Target: {target_language}, Translation: {translation}")
                self.wfile.write(translation.encode('utf-8'))
            except Exception as e:
                print(f"Error: {e}")
                error_message = "翻訳エラーが発生しました。もう一度お試しください。"
                self.wfile.write(error_message.encode('utf-8'))
        else:
            # 静的HTMLを提供
            super().do_GET()

# SSL対応サーバーの設定
host = socket.gethostbyname(socket.gethostname())
port = 8000
httpd = HTTPServer((host, port), MyHandler)
httpd.socket = ssl.wrap_socket(httpd.socket, certfile='server.pem', server_side=True)
print(f"Ready! Access the translator at https://{host}:{port}")
httpd.serve_forever()
