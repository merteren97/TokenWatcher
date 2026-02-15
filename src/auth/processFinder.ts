import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as https from 'https';

const execAsync = promisify(exec);

export interface ProcessInfo {
  pid: number;
  extensionPort: number;
  connectPort: number;
  csrfToken: string;
}

export class ProcessFinder {
  private processName: string;

  constructor() {
    if (os.platform() === 'win32') {
      this.processName = 'language_server_windows_x64.exe';
    } else if (os.platform() === 'darwin') {
      this.processName = `language_server_macos${process.arch === 'arm64' ? '_arm' : ''}`;
    } else {
      this.processName = `language_server_linux${process.arch === 'arm64' ? '_arm' : '_x64'}`;
    }
  }

  async detectProcessInfo(): Promise<ProcessInfo | null> {
    try {
      const processInfo = await this.findAntigravityProcess();
      if (!processInfo) {
        return null;
      }

      const ports = await this.getListeningPorts(processInfo.pid);
      if (ports.length === 0) {
        return null;
      }

      const validPort = await this.findWorkingPort(ports, processInfo.csrfToken);
      if (!validPort) {
        return null;
      }

      return {
        pid: processInfo.pid,
        extensionPort: processInfo.extensionPort,
        connectPort: validPort,
        csrfToken: processInfo.csrfToken
      };
    } catch (error) {
      console.error('Process detection error:', error);
      return null;
    }
  }

  private async findAntigravityProcess(): Promise<{pid: number; extensionPort: number; csrfToken: string} | null> {
    if (os.platform() !== 'win32') {
      // Unix/Mac için basit implementasyon
      try {
        const { stdout } = await execAsync(`pgrep -af ${this.processName}`);
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('--extension_server_port')) {
            const parts = line.trim().split(/\s+/);
            const pid = parseInt(parts[0], 10);
            const cmd = line.substring(parts[0].length).trim();
            
            const portMatch = cmd.match(/--extension_server_port[=\s]+(\d+)/);
            const tokenMatch = cmd.match(/--csrf_token[=\s]+([a-f0-9\-]+)/i);
            
            if (tokenMatch && tokenMatch[1]) {
              return {
                pid,
                extensionPort: portMatch ? parseInt(portMatch[1], 10) : 0,
                csrfToken: tokenMatch[1]
              };
            }
          }
        }
      } catch (e) {
        return null;
      }
      return null;
    }

    // Windows PowerShell komutu
    const cmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"name='${this.processName}'\\" | Select-Object ProcessId,CommandLine | ConvertTo-Json"`;
    
    try {
      const { stdout } = await execAsync(cmd);
      const data = JSON.parse(stdout.trim());
      
      let processes = Array.isArray(data) ? data : [data];
      
      // Antigravity process'ini bul
      const antigravityProcesses = processes.filter((p: any) => {
        const cmdLine = (p.CommandLine || '').toLowerCase();
        return cmdLine.includes('antigravity') || 
               /--app_data_dir\s+antigravity/i.test(p.CommandLine);
      });
      
      if (antigravityProcesses.length === 0) {
        return null;
      }
      
      const process = antigravityProcesses[0];
      const commandLine = process.CommandLine || '';
      const pid = process.ProcessId;
      
      const portMatch = commandLine.match(/--extension_server_port[=\s]+(\d+)/);
      const tokenMatch = commandLine.match(/--csrf_token[=\s]+([a-f0-9\-]+)/i);
      
      if (!tokenMatch || !tokenMatch[1]) {
        return null;
      }
      
      return {
        pid,
        extensionPort: portMatch ? parseInt(portMatch[1], 10) : 0,
        csrfToken: tokenMatch[1]
      };
    } catch (error) {
      console.error('Process find error:', error);
      return null;
    }
  }

  private async getListeningPorts(pid: number): Promise<number[]> {
    if (os.platform() !== 'win32') {
      // Unix/Mac için
      try {
        const { stdout } = await execAsync(`lsof -nP -a -iTCP -sTCP:LISTEN -p ${pid}`);
        const ports: number[] = [];
        const regex = new RegExp(`^\\S+\\s+${pid}\\s+.*?(?:TCP|UDP)\\s+(?:\\*|[\\d.]+|\\[[\\da-f:]+\\]):(\\d+)\\s+\\(LISTEN\\)`, 'gim');
        let match;
        while ((match = regex.exec(stdout)) !== null) {
          ports.push(parseInt(match[1], 10));
        }
        return ports.sort((a, b) => a - b);
      } catch (e) {
        return [];
      }
    }

    // Windows PowerShell
    const cmd = `powershell -NoProfile -Command "Get-NetTCPConnection -OwningProcess ${pid} -State Listen | Select-Object -ExpandProperty LocalPort | ConvertTo-Json"`;
    
    try {
      const { stdout } = await execAsync(cmd);
      const data = JSON.parse(stdout.trim());
      
      if (Array.isArray(data)) {
        return data.filter((p: any) => typeof p === 'number').sort((a, b) => a - b);
      } else if (typeof data === 'number') {
        return [data];
      }
      return [];
    } catch (error) {
      console.error('Port list error:', error);
      return [];
    }
  }

  private async findWorkingPort(ports: number[], csrfToken: string): Promise<number | null> {
    for (const port of ports) {
      const isWorking = await this.testPort(port, csrfToken);
      if (isWorking) {
        return port;
      }
    }
    return null;
  }

  private testPort(port: number, csrfToken: string): Promise<boolean> {
    return new Promise((resolve) => {
      const options = {
        hostname: '127.0.0.1',
        port,
        path: '/exa.language_server_pb.LanguageServerService/GetUnleashData',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Codeium-Csrf-Token': csrfToken,
          'Connect-Protocol-Version': '1'
        },
        rejectUnauthorized: false,
        timeout: 3000
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              JSON.parse(body);
              resolve(true);
            } catch {
              resolve(false);
            }
          } else {
            resolve(false);
          }
        });
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.write(JSON.stringify({ wrapper_data: {} }));
      req.end();
    });
  }
}
