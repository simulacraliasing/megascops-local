; Basic Information
Name "Megascops-local CUDA Patch"
OutFile "Megascops-local-cuda_path.exe"
Unicode True

SetCompressor /SOLID /FINAL lzma

!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "MUI2.nsh"

; Interface Settings
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

RequestExecutionLevel user

; Patch Version
!define PATCH_VERSION "12"
!define SOURCE_DLL_FOLDER "lib"  ; Folder relative to the NSIS script

Function .onInit
  Var /GLOBAL InstallFound
  StrCpy $InstallFound "0"
  ReadRegStr $INSTDIR HKCU "Software\megascops-local\Megascops-local" ""
  ${If} $INSTDIR != ""
    StrCpy $InstallFound "1"
    DetailPrint "Installation directory found in current user registry: $INSTDIR"
  ${EndIf}

  ; If not found in registry, try common installation locations
  ${If} $InstallFound == "0"
    ; Try current user's AppData\Local directory
    ${If} ${FileExists} "$LOCALAPPDATA\Megascops-local\Megascops-local.exe"
      StrCpy $INSTDIR "$LOCALAPPDATA\Megascops-local"
      StrCpy $InstallFound "1"
    ; Try current user's programs directory
    ${ElseIf} ${FileExists} "$PROFILE\AppData\Local\Programs\Megascops-local\Megascops-local.exe"
      StrCpy $INSTDIR "$PROFILE\AppData\Local\Programs\Megascops-local"
      StrCpy $InstallFound "1"
    ; Try standard program files directory
    ${ElseIf} ${FileExists} "$PROGRAMFILES\Megascops-local\Megascops-local.exe"
      StrCpy $INSTDIR "$PROGRAMFILES\Megascops-local"
      StrCpy $InstallFound "1"
    ; If not found, use default location
    ${Else}
      StrCpy $INSTDIR "$LOCALAPPDATA\Megascops-local"
    ${EndIf}
  ${EndIf}
  
  ; Final check if application exists
  ${If} ${FileExists} "$INSTDIR\Megascops-local.exe"
    ; Application exists, continue
  ${Else}
    MessageBox MB_YESNO|MB_ICONQUESTION "Application not found at $INSTDIR. Do you want to continue anyway?" IDYES continue IDNO abort
    abort:
      Abort
    continue:
  ${EndIf}
FunctionEnd

Section "Install DLL Patch"
  SetOutPath $INSTDIR
  
  ; Simple warning about closing the application
  MessageBox MB_OK|MB_ICONINFORMATION "Please make sure Megascops-local is not running before continuing."
  
  DetailPrint "Starting DLL patch installation ${PATCH_VERSION}..."
  
  ; Create backup directory
  CreateDirectory "$INSTDIR\Backup_${PATCH_VERSION}"
  
  ; Create a file to record updated DLLs
  FileOpen $R1 "$INSTDIR\cuda_patch_info.txt" w
  FileWrite $R1 "cuda_version: ${PATCH_VERSION}$\r$\n"
  FileWrite $R1 "cuda_updated_files:$\r$\n"
  
  ; Include all DLL files from the bin directory
  ; First, create a temporary directory to extract DLLs
  SetOutPath "$TEMP\megascops_cuda_patch"
  
  ; Include all DLLs from the bin folder
  File /r "${SOURCE_DLL_FOLDER}\*.dll"
  
  ; Now process each DLL file
  FindFirst $0 $1 "$TEMP\megascops_cuda_patch\*.dll"
  ${DoWhile} $1 != ""
    DetailPrint "Processing file: $1"
    
    ; Backup original DLL file (if exists)
    ${If} ${FileExists} "$INSTDIR\$1"
      DetailPrint "Backing up $1..."
      CopyFiles /SILENT "$INSTDIR\$1" "$INSTDIR\Backup_${PATCH_VERSION}\$1"
      ; Delete original file for replacement
      Delete "$INSTDIR\$1"
    ${EndIf}
    
    ; Copy new DLL file
    DetailPrint "Updating $1..."
    CopyFiles /SILENT "$TEMP\megascops_cuda_patch\$1" "$INSTDIR\$1"
    
    ; Record updated file
    FileWrite $R1 "- $1$\r$\n"
    
    ; Find next file
    FindNext $0 $1
  ${Loop}
  FindClose $0
  
  ; Close record file
  FileClose $R1
  
  ; Clean up temporary directory
  RMDir /r "$TEMP\megascops_cuda_patch"
  
  DetailPrint "Patch installation completed!"
  MessageBox MB_OK "DLL patch has been successfully installed! Application has been updated to patch version ${PATCH_VERSION}."
SectionEnd
