from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import argparse
import webbrowser
import socket
import sys


def find_free_port(start_port: int = 8000) -> int:
    port = start_port
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return port
            except OSError:
                port += 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve the current directory over HTTP")
    parser.add_argument("--port", type=int, default=8000, help="Port to serve on (default 8000)")
    parser.add_argument("--no-open", action="store_true", help="Don't open the browser automatically")
    args = parser.parse_args()

    port = args.port

    if port == 0:
        port = find_free_port(8000)
    else:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
            except OSError:
                print(f"Port {port} is in use, finding a free port...")
                port = find_free_port(port + 1)

    host = "0.0.0.0"
    server_address = (host, port)

    handler_class = SimpleHTTPRequestHandler
    httpd = ThreadingHTTPServer(server_address, handler_class)

    url = f"http://localhost:{port}/"

    print(f"Serving HTTP on {host} port {port} (http://localhost:{port}/) ...")

    if not args.no_open:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Shutting down server...")
        httpd.shutdown()
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
