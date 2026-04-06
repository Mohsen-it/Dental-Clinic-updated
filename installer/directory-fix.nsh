; Directory auto-completion fix for electron-builder
; This include adds automatic directory path completion when user selects drive only

!include "LogicLib.nsh"

; Simple function to be called manually
Function FixDirectoryPath
  Call CheckDirectoryPath
FunctionEnd

; Function to check and update directory path
Function CheckDirectoryPath
  ; Get the directory page window
  FindWindow $0 "#32770" "" $HWNDPARENT
  ${If} $0 != 0
    ; Get directory field
    GetDlgItem $1 $0 1019
    ${If} $1 != 0
      ; Get current text
      System::Call "user32::GetWindowText(i $1, t .r2, i 1024)"
      
      ; Check if it's a drive only
      StrLen $3 $2
      ${If} $3 == 2
        ; Add backslash and product name (C: -> C:\ProductName)
        StrCpy $2 "$2\${PRODUCT_NAME}"
        System::Call "user32::SetWindowText(i $1, t '$2')"
        StrCpy $INSTDIR $2
      ${ElseIf} $3 == 3
        ; Check if it ends with backslash (C:\)
        StrCpy $4 $2 1 -1
        ${If} $4 == "\"
          ; Add product name (C:\ -> C:\ProductName)
          StrCpy $2 "$2${PRODUCT_NAME}"
          System::Call "user32::SetWindowText(i $1, t '$2')"
          StrCpy $INSTDIR $2
        ${EndIf}
      ${EndIf}
      
      ; Enable install button
      GetDlgItem $0 $HWNDPARENT 1
      EnableWindow $0 1
    ${EndIf}
  ${EndIf}
FunctionEnd
