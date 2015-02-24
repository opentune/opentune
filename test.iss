; -- Example1.iss --
; Demonstrates copying 3 files and creating an icon.

; SEE THE DOCUMENTATION FOR DETAILS ON CREATING .ISS SCRIPT FILES!

[Setup]
AppName=OpenTune
AppVersion=1.2
DefaultDirName={pf}\OpenTune
DefaultGroupName=OpenTune
UninstallDisplayIcon={app}\opentune.exe
Compression=lzma2/ultra64
SolidCompression=yes
OutputDir=userdocs:Inno Setup Examples Output

[Files]
Source: "*"; DestDir: "{app}"; Flags: recursesubdirs
Source: "images/*"; DestDir: "{app}/images"

[Tasks]
Name: desktopicon; Description: "Create a Desktop icon";

[Icons]
Name: "{group}\OpenTune"; Filename: "{app}\opentune.exe"
Name: "{commondesktop}\OpenTune"; Filename: "{app}\opentune.exe"; WorkingDir: "{app}"; IconFilename: "{app}/icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\opentune.exe"; Description: "Launch OpenTune"; Flags: postinstall nowait