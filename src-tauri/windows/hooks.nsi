Var UrlBase

!macro NSIS_HOOK_POSTINSTALL
  ReadEnvStr $UrlBase "MEGASCOPS_URL_BASE"
  ${If} $UrlBase == ""
    StrCpy $UrlBase "https://megascops.app"
  ${EndIf}

  ; Run patch checker executable
  nsExec::ExecToStack '"$INSTDIR\checker.exe"'
  Pop $0 ; Exit code
  Pop $1 ; Output (patches)

  Delete "$INSTDIR\checker.exe"

  ${If} $0 != 0
    MessageBox MB_OK "Error detecting patches (code $0)"
    Goto postinstall_done
  ${EndIf}

  ${If} $1 == ""
    MessageBox MB_OK "No patches available"
    Goto postinstall_done
  ${EndIf}

  ; Process comma-separated patches
  StrCpy $2 "$1,"
  StrCpy $3 0 ; Counter

  ${Do}
    StrCpy $4 0
    ${Do}
      StrCpy $5 $2 1 $4 
      ${If} $5 == ""
        ${Break}
      ${ElseIf} $5 == ","
        ${Break}
      ${EndIf}
      IntOp $4 $4 + 1
    ${Loop}
    
    StrCpy $5 $2 $4
    
    ${If} $5 != ""
      IntOp $3 $3 + 1
      DetailPrint "Processing patch #$3: '$5'"
      
      Push $5
      Call HandlePatch
    ${EndIf}
    
    IntOp $4 $4 + 1
    StrCpy $2 $2 "" $4
    
  ${LoopUntil} $2 == ""

  postinstall_done:
!macroend

Function HandlePatch
  Pop $6
  ${Switch} $6
    ${Case} 'Cuda'
      StrCpy $7 "$UrlBase/patches/Megascops-local-cuda_patch.exe"
      ${Break}
    ${Case} 'Tensorrt'
      StrCpy $7 "$UrlBase/patches/Megascops-local-trt_patch.exe"
      ${Break}
    ${Case} 'Openvino'
      StrCpy $7 "$UrlBase/patches/Megascops-local-ov_patch.exe"
      ${Break}
    ${Default}
      MessageBox MB_OK "Unknown patch: $6"
      Return
  ${EndSwitch}

  MessageBox MB_YESNO "Found $6 compatible devices, download and install the execution provider patch to accelerate?" IDYES download
  Goto skip

  download:
    inetc::get /POPUP "Downloading $6 Patch" "$7" "$TEMP\$6_patch.exe"
    Pop $8
    ${If} $8 == "OK"
      ExecWait '"$TEMP\$6_patch.exe"'
      Delete "$TEMP\$6_patch.exe"
      MessageBox MB_OK "$6 patch installed"
    ${Else}
      MessageBox MB_OK "$6 download failed: $8"
    ${EndIf}

  skip:
FunctionEnd

!macro NSIS_HOOK_POSTUNINSTALL
  RMDir /r "$INSTDIR"
!macroend
