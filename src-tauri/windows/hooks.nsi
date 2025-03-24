!macro StrContains OUT NEEDLE HAYSTACK
  Push `${HAYSTACK}`
  Push `${NEEDLE}`
  Call StrContains
  Pop `${OUT}`
!macroend

Function StrContains
  Exch $R1 ; needle
  Exch
  Exch $R2 ; haystack
  Push $R3
  Push $R4
  Push $R5
  
  StrCpy $R3 -1
  StrLen $R4 $R1
  StrLen $R5 $R2
  IntOp $R5 $R5 - $R4
  
  loop:
    IntOp $R3 $R3 + 1
    IntCmp $R3 $R5 done
    StrCpy $R1 $R2 $R4 $R3
    StrCmp $R1 $R0 found done
    Goto loop
    
  found:
    StrCpy $R1 $R0
    Goto done
    
  done:
    Pop $R5
    Pop $R4
    Pop $R3
    Pop $R2
    Exch $R1
FunctionEnd

!macro NSIS_HOOK_POSTINSTALL
  # Check for NVIDIA GPU
  # Create a temporary batch file to run nvidia-smi and capture output
  FileOpen $0 "$TEMP\check_cuda.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'nvidia-smi --query-gpu=name,compute_cap --format=csv > "%TEMP%\nvidia_check.txt" 2>&1$\r$\n'
  FileWrite $0 'exit /b %ERRORLEVEL%$\r$\n'
  FileClose $0
  
  # Execute the batch file silently
  nsExec::ExecToStack '"$TEMP\check_cuda.bat"'
  Pop $0 # Return value
  Pop $1 # Output
  
  # Check if nvidia-smi was successful
  ${If} $0 == "0"
    # Read the output file
    FileOpen $2 "$TEMP\nvidia_check.txt" r
    FileRead $2 $3
    FileClose $2
    
    # Parse compute capability from output
    # Expected format: name, compute_capability
    # Example: "NVIDIA GeForce RTX 3080, 8.6"
    StrCpy $4 $3 # Store full GPU info
    
    # Extract compute capability
    !insertmacro StrContains $5 "," $3
    ${If} $5 != ""
      StrCpy $6 $3 "" $5 # Get everything after the comma
      StrCpy $6 $6 # Trim leading/trailing spaces
      
      # Compare compute capability with 7.5
      ${If} $6 >= "7.5"
        # High compute capability - recommend both CUDA and TensorRT
        MessageBox MB_YESNO "NVIDIA GPU detected with high compute capability ($6):$\r$\n$\r$\n$4$\r$\n$\r$\nWould you like to download and install the CUDA + TensorRT patch for optimal GPU acceleration?" IDYES download_tensorrt_patch IDNO skip_nvidia_patch
        
        download_tensorrt_patch:
          # Show download progress dialog
          MessageBox MB_OK "Downloading CUDA + TensorRT patch. Please wait..."
          
          # Define your TensorRT patch download URL
          StrCpy $7 "https://github.com/simulacraliasing/megascops-local/releases/download/patch/Megascops-local-trt_patch.exe"
          
          # Download the patch file
          inetc::get /POPUP "Downloading CUDA + TensorRT Patch" /CAPTION "Download Progress" "$7" "$TEMP\tensorrt_patch.exe" /END
          Pop $8 # Get download status
          
          # Check if download was successful
          ${If} $8 == "OK"
            # Run the downloaded patch
            ExecWait '"$TEMP\tensorrt_patch.exe"'
            Delete "$TEMP\tensorrt_patch.exe" # Clean up after execution
            MessageBox MB_OK "CUDA + TensorRT patch installation complete."
          ${Else}
            MessageBox MB_OK "Failed to download CUDA + TensorRT patch. Error: $8$\r$\nPlease try installing it manually later."
          ${EndIf}
          Goto nvidia_patch_done
      ${Else}
        # Lower compute capability - recommend CUDA only
        MessageBox MB_YESNO "NVIDIA GPU detected:$\r$\n$\r$\n$4$\r$\n$\r$\nWould you like to download and install the CUDA patch to enable GPU acceleration for this application?" IDYES download_cuda_patch IDNO skip_nvidia_patch
        
        download_cuda_patch:
          # Show download progress dialog
          MessageBox MB_OK "Downloading CUDA patch. Please wait..."
          
          # Define your patch download URL
          StrCpy $7 "https://github.com/simulacraliasing/megascops-local/releases/download/patch/Megascops-local-cuda_patch.exe"
          
          # Download the patch file
          inetc::get /POPUP "Downloading CUDA Patch" /CAPTION "Download Progress" "$7" "$TEMP\cuda_patch.exe" /END
          Pop $8 # Get download status
          
          # Check if download was successful
          ${If} $8 == "OK"
            # Run the downloaded patch
            ExecWait '"$TEMP\cuda_patch.exe"'
            Delete "$TEMP\cuda_patch.exe" # Clean up after execution
            MessageBox MB_OK "CUDA patch installation complete."
          ${Else}
            MessageBox MB_OK "Failed to download CUDA patch. Error: $8$\r$\nPlease try installing it manually later."
          ${EndIf}
          Goto nvidia_patch_done
      ${EndIf}
    ${Else}
      # Couldn't parse compute capability, offer standard CUDA patch
      MessageBox MB_YESNO "NVIDIA GPU detected:$\r$\n$\r$\n$4$\r$\n$\r$\nWould you like to download and install the CUDA patch to enable GPU acceleration for this application?" IDYES download_cuda_patch_fallback IDNO skip_nvidia_patch
      
      download_cuda_patch_fallback:
        # Show download progress dialog
        MessageBox MB_OK "Downloading CUDA patch. Please wait..."
        
        # Define your patch download URL
        StrCpy $7 "https://github.com/simulacraliasing/megascops-local/releases/download/patch/Megascops-local-cuda_patch.exe"
        
        # Download the patch file
        inetc::get /POPUP "Downloading CUDA Patch" /CAPTION "Download Progress" "$7" "$TEMP\cuda_patch.exe" /END
        Pop $8 # Get download status
        
        # Check if download was successful
        ${If} $8 == "OK"
          # Run the downloaded patch
          ExecWait '"$TEMP\cuda_patch.exe"'
          Delete "$TEMP\cuda_patch.exe" # Clean up after execution
          MessageBox MB_OK "CUDA patch installation complete."
        ${Else}
          MessageBox MB_OK "Failed to download CUDA patch. Error: $8$\r$\nPlease try installing it manually later."
        ${EndIf}
        Goto nvidia_patch_done
    ${EndIf}
    
    skip_nvidia_patch:
      # User declined to download patch
      MessageBox MB_OK "You can install the NVIDIA GPU acceleration patch later if needed for optimal performance."
    
    nvidia_patch_done:
  ${Else}
    # No NVIDIA GPU or nvidia-smi not available
    MessageBox MB_OK "No CUDA-compatible NVIDIA GPU detected."
  ${EndIf}
  
  # Clean up NVIDIA check files
  Delete "$TEMP\check_cuda.bat"
  Delete "$TEMP\nvidia_check.txt"
  
  # Now check for Intel GPU independently
  # Create a temporary batch file to check for Intel GPU
  FileOpen $0 "$TEMP\check_intel.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'wmic path win32_VideoController get Name > "%TEMP%\intel_check.txt" 2>&1$\r$\n'
  FileWrite $0 'exit /b %ERRORLEVEL%$\r$\n'
  FileClose $0
  
  # Execute the batch file silently
  nsExec::ExecToStack '"$TEMP\check_intel.bat"'
  Pop $0 # Return value
  
  # Check if wmic command was successful
  ${If} $0 == "0"
    # Read the output file
    FileOpen $2 "$TEMP\intel_check.txt" r
    
    # Initialize Intel detection flag
    StrCpy $6 "0" # 0 = not found, 1 = found
    StrCpy $8 "" # Will store Intel GPU name
    
    # Read line by line to find Intel GPU
    loop_read_intel:
      FileRead $2 $3
      ${If} $3 == ""
        Goto done_read_intel
      ${EndIf}
      
      # Check if the line contains "Intel"
      ${If} $3 != ""
        !insertmacro StrContains $7 "Intel" $3
        ${If} $7 != ""
          StrCpy $6 "1" # Intel GPU found
          StrCpy $8 $3 # Save the Intel GPU name
        ${EndIf}
      ${EndIf}
      Goto loop_read_intel
    
    done_read_intel:
    FileClose $2
    
    # If Intel GPU was found
    ${If} $6 == "1"
      # Display message about OpenVINO compatibility
      MessageBox MB_YESNO "Intel GPU detected:$\r$\n$\r$\n$8$\r$\n$\r$\nWould you like to download and install the OpenVINO patch to enable GPU acceleration for this application?" IDYES download_openvino IDNO skip_openvino
      
      download_openvino:
        # Show download progress dialog
        MessageBox MB_OK "Downloading OpenVINO patch. Please wait..."
        
        # Define your OpenVINO patch download URL
        StrCpy $4 "https://github.com/simulacraliasing/megascops-local/releases/download/patch/Megascops-local-ov_patch.exe"
        
        # Download the patch file
        inetc::get /POPUP "Downloading OpenVINO Patch" /CAPTION "Download Progress" "$4" "$TEMP\openvino_patch.exe" /END
        Pop $5 # Get download status
        
        # Check if download was successful
        ${If} $5 == "OK"
          # Run the downloaded patch
          ExecWait '"$TEMP\openvino_patch.exe"'
          Delete "$TEMP\openvino_patch.exe" # Clean up after execution
          MessageBox MB_OK "OpenVINO patch installation complete."
        ${Else}
          MessageBox MB_OK "Failed to download OpenVINO patch. Error: $5$\r$\nPlease try installing it manually later."
        ${EndIf}
        Goto openvino_done
      
      skip_openvino:
        # User declined to download patch
        MessageBox MB_OK "You can install the OpenVINO patch later if needed for optimal performance."
      
      openvino_done:
    ${Else}
      # No Intel GPU detected
      MessageBox MB_OK "No Intel GPU detected."
    ${EndIf}
  ${Else}
    # wmic command failed
    MessageBox MB_OK "Could not detect Intel GPU information."
  ${EndIf}
  
  # Clean up Intel check files
  Delete "$TEMP\check_intel.bat"
  Delete "$TEMP\intel_check.txt"
  
  # Final message if no compatible GPU was found
  ${If} $0 != "0"
  ${AndIf} $6 != "1"
    MessageBox MB_OK "No compatible GPU detected. The application will run using CPU only."
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Remove all files and subdirectories in the installation directory
  RMDir /r "$INSTDIR"
!macroend
