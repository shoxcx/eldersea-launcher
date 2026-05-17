$File = "release/win-unpacked/resources/app.asar"
if (Test-Path $File) {
    Write-Host "Checking lock for $File"
    $showLock = @'
    using System;
    using System.Collections.Generic;
    using System.Runtime.InteropServices;

    public class FileLockInfo {
        [StructLayout(LayoutKind.Sequential)]
        struct RM_UNIQUE_PROCESS {
            public int dwProcessId;
            public System.Runtime.InteropServices.ComTypes.FILETIME ProcessStartTime;
        }

        const int RmForceShutdown = 0x1;
        const int RmRebootReasonNone = 0;

        [DllImport("rstrtmgr.dll", CharSet = CharSet.Auto)]
        static extern int RmStartSession(out uint pSessionHandle, int dwSessionFlags, string strSessionKey);

        [DllImport("rstrtmgr.dll")]
        static extern int RmEndSession(uint dwSessionHandle);

        [DllImport("rstrtmgr.dll", CharSet = CharSet.Auto)]
        static extern int RmRegisterResources(uint dwSessionHandle, uint nFiles, string[] rgsFileNames,
            uint nApplications, RM_UNIQUE_PROCESS[] rgApplications, uint nServices, string[] rgsServiceNames);

        [DllImport("rstrtmgr.dll")]
        static extern int RmGetList(uint dwSessionHandle, out uint pnProcInfoNeeded,
            ref uint pnProcInfo, [In, Out] RM_PROCESS_INFO[] rgAffectedApps, ref uint lpdwRebootReasons);

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
        struct RM_PROCESS_INFO {
            public RM_UNIQUE_PROCESS Process;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)]
            public string strAppName;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)]
            public string strServiceShortName;
            public int ApplicationType;
            public uint AppStatus;
            public uint TSSessionId;
            [MarshalAs(UnmanagedType.Bool)]
            public bool bRestartable;
        }

        public static List<int> GetProcessesLockingFile(string path) {
            uint handle;
            string key = Guid.NewGuid().ToString();
            List<int> processes = new List<int>();

            int res = RmStartSession(out handle, 0, key);
            if (res != 0) return processes;

            try {
                string[] resources = new string[] { path };
                res = RmRegisterResources(handle, (uint)resources.Length, resources, 0, null, 0, null);
                if (res != 0) return processes;

                uint pnProcInfoNeeded = 0;
                uint pnProcInfo = 0;
                uint lpdwRebootReasons = RmRebootReasonNone;

                res = RmGetList(handle, out pnProcInfoNeeded, ref pnProcInfo, null, ref lpdwRebootReasons);
                if (res == 234) { // ERROR_MORE_DATA
                    RM_PROCESS_INFO[] infos = new RM_PROCESS_INFO[pnProcInfoNeeded];
                    pnProcInfo = pnProcInfoNeeded;
                    res = RmGetList(handle, out pnProcInfoNeeded, ref pnProcInfo, infos, ref lpdwRebootReasons);
                    if (res == 0) {
                        foreach (var info in infos) {
                            processes.Add(info.Process.dwProcessId);
                        }
                    }
                }
            } finally {
                RmEndSession(handle);
            }

            return processes;
        }
    }
'@

    Add-Type -TypeDefinition $showLock -ErrorAction SilentlyContinue
    $pids = [FileLockInfo]::GetProcessesLockingFile((Resolve-Path $File).Path)
    if ($pids.Count -gt 0) {
        Write-Host "Processes locking file:"
        foreach ($itemPid in $pids) {
            $proc = Get-Process -Id $itemPid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "PID: $($proc.Id) - Name: $($proc.Name) - Path: $($proc.Path)"
            } else {
                Write-Host "PID: $itemPid (Process not found or already exited)"
            }
        }
    } else {
        Write-Host "No processes found locking this file via Restart Manager."
    }
} else {
    Write-Host "File not found: $File"
}
