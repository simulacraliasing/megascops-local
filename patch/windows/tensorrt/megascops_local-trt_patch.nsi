; Basic Information
Name "Megascops-local TensorRT Patch"
OutFile "Megascops-local-trt_patch.exe"
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

; 添加语言支持
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"

; 定义中英文消息字符串
!define MSG_APP_NOT_FOUND_EN "Application not found at $INSTDIR. Do you want to continue anyway?"
!define MSG_APP_NOT_FOUND_CN "在 $INSTDIR 未找到应用程序。是否仍要继续？"

!define MSG_ENSURE_NOT_RUNNING_EN "Please make sure Megascops-local is not running before continuing."
!define MSG_ENSURE_NOT_RUNNING_CN "请确保 Megascops-local 未在运行后再继续。"

!define MSG_STARTING_PATCH_EN "Starting DLL patch installation ${PATCH_VERSION}..."
!define MSG_STARTING_PATCH_CN "开始安装 DLL 补丁 ${PATCH_VERSION}..."

!define MSG_PROCESSING_FILE_EN "Processing file: $1"
!define MSG_PROCESSING_FILE_CN "正在处理文件: $1"

!define MSG_BACKING_UP_EN "Backing up $1..."
!define MSG_BACKING_UP_CN "正在备份 $1..."

!define MSG_UPDATING_EN "Updating $1..."
!define MSG_UPDATING_CN "正在更新 $1..."

!define MSG_PATCH_COMPLETED_EN "Patch installation completed!"
!define MSG_PATCH_COMPLETED_CN "补丁安装完成！"

!define MSG_SUCCESS_EN "DLL patch has been successfully installed! Application has been updated to patch version ${PATCH_VERSION}."
!define MSG_SUCCESS_CN "DLL 补丁已成功安装！应用程序已更新至补丁版本 ${PATCH_VERSION}。"

RequestExecutionLevel user

; Patch Version
!define PATCH_VERSION "12"
!define SOURCE_DLL_FOLDER "lib"  ; Folder relative to the NSIS script

; 添加语言检测函数
Function GetUserLanguage
  Push $0
  System::Call 'kernel32::GetUserDefaultUILanguage() i.r0'
  ${If} $0 == 2052  ; 简体中文的LCID
    StrCpy $LANGUAGE ${LANG_SIMPCHINESE}
  ${Else}
    StrCpy $LANGUAGE ${LANG_ENGLISH}
  ${EndIf}
  Pop $0
FunctionEnd

Function .onInit
  ; 检测用户语言
  Call GetUserLanguage
  
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
    ${If} $LANGUAGE == ${LANG_SIMPCHINESE}
      MessageBox MB_YESNO|MB_ICONQUESTION "${MSG_APP_NOT_FOUND_CN}" IDYES continue IDNO abort
    ${Else}
      MessageBox MB_YESNO|MB_ICONQUESTION "${MSG_APP_NOT_FOUND_EN}" IDYES continue IDNO abort
    ${EndIf}
    abort:
      Abort
    continue:
  ${EndIf}
FunctionEnd

Section "Install DLL Patch"
  SetOutPath $INSTDIR
  
  ; Simple warning about closing the application
  ${If} $LANGUAGE == ${LANG_SIMPCHINESE}
    MessageBox MB_OK|MB_ICONINFORMATION "${MSG_ENSURE_NOT_RUNNING_CN}"
    DetailPrint "${MSG_STARTING_PATCH_CN}"
  ${Else}
    MessageBox MB_OK|MB_ICONINFORMATION "${MSG_ENSURE_NOT_RUNNING_EN}"
    DetailPrint "${MSG_STARTING_PATCH_EN}"
  ${EndIf}
  
  ; Create backup directory
  CreateDirectory "$INSTDIR\Backup_${PATCH_VERSION}"
  
  ; Create a file to record updated DLLs
  FileOpen $R1 "$INSTDIR\trt_patch_info.txt" w
  FileWrite $R1 "trt_version: ${PATCH_VERSION}$\r$\n"
  FileWrite $R1 "trt_updated_files:$\r$\n"
  
  ; Include all DLL files from the bin directory
  ; First, create a temporary directory to extract DLLs
  SetOutPath "$TEMP\megascops_trt_patch"
  
  ; Include all DLLs from the bin folder
  File /r "${SOURCE_DLL_FOLDER}\*.dll"
  
  ; Now process each DLL file
  FindFirst $0 $1 "$TEMP\megascops_trt_patch\*.dll"
  ${DoWhile} $1 != ""
    ${If} $LANGUAGE == ${LANG_SIMPCHINESE}
      DetailPrint "${MSG_PROCESSING_FILE_CN}"
    ${Else}
      DetailPrint "${MSG_PROCESSING_FILE_EN}"
    ${EndIf}
    
    ; Backup original DLL file (if exists)
    ${If} ${FileExists} "$INSTDIR\$1"
      ${If} $LANGUAGE == ${LANG_SIMPCHINESE}
        DetailPrint "${MSG_BACKING_UP_CN}"
      ${Else}
        DetailPrint "${MSG_BACKING_UP_EN}"
      ${EndIf}
      CopyFiles /SILENT "$INSTDIR\$1" "$INSTDIR\Backup_${PATCH_VERSION}\$1"
      ; Delete original file for replacement
      Delete "$INSTDIR\$1"
    ${EndIf}
    
    ; Copy new DLL file
    ${If} $LANGUAGE == ${LANG_SIMPCHINESE}
      DetailPrint "${MSG_UPDATING_CN}"
    ${Else}
      DetailPrint "${MSG_UPDATING_EN}"
    ${EndIf}
    CopyFiles /SILENT "$TEMP\megascops_trt_patch\$1" "$INSTDIR\$1"
    
    ; Record updated file
    FileWrite $R1 "- $1$\r$\n"
    
    ; Find next file
    FindNext $0 $1
  ${Loop}
  FindClose $0
  
  ; Close record file
  FileClose $R1
  
  ; Clean up temporary directory
  RMDir /r "$TEMP\megascops_trt_patch"
  
  ${If} $LANGUAGE == ${LANG_SIMPCHINESE}
    DetailPrint "${MSG_PATCH_COMPLETED_CN}"
    MessageBox MB_OK "${MSG_SUCCESS_CN}"
  ${Else}
    DetailPrint "${MSG_PATCH_COMPLETED_EN}"
    MessageBox MB_OK "${MSG_SUCCESS_EN}"
  ${EndIf}
SectionEnd
