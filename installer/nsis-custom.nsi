; ====================================================
; NSIS Custom Script - Fix Desktop Shortcut Icon
; DentalClinic - agorracode
; ====================================================
; electron-builder creates the desktop shortcut WITHOUT
; specifying an explicit icon file. Windows then relies
; on its icon cache for the exe, which can show the old
; default Electron icon. This script recreates the
; shortcut with an explicit .ico file reference.
; ====================================================

!macro customInstall
  ; ===== Step 1: Delete the shortcut created by electron-builder =====
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"

  ; ===== Step 2: Recreate with explicit icon from .ico file =====
  ; Using the .ico file directly (not the exe) is more reliable
  ; because Windows is less likely to serve a cached version
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" \
    "$INSTDIR\${APP_EXECUTABLE_FILENAME}" \
    "" \
    "$INSTDIR\resources\assets\icon.ico" \
    0

  ; ===== Step 3: Also fix Start Menu shortcut =====
  IfFileExists "$SMPROGRAMS\${PRODUCT_NAME}.lnk" 0 +3
    Delete "$SMPROGRAMS\${PRODUCT_NAME}.lnk"
    CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}.lnk" \
      "$INSTDIR\${APP_EXECUTABLE_FILENAME}" \
      "" \
      "$INSTDIR\resources\assets\icon.ico" \
      0

  ; ===== Step 4: Force Windows to refresh icon cache =====
  ; Notify Shell of association changes (SHCNE_ASSOCCHANGED)
  System::Call "shell32::SHChangeNotify(l, l, i, i)(0x08000000, 0x0000, 0, 0)"

  ; Rebuild icon cache via ie4uinit
  nsExec::Exec '"$SYSDIR\ie4uinit.exe" -show'
  nsExec::Exec '"$SYSDIR\ie4uinit.exe" -ClearIconCache'
!macroend

!macro customUnInstall
  ; Refresh icon cache on uninstall
  System::Call "shell32::SHChangeNotify(l, l, i, i)(0x08000000, 0x0000, 0, 0)"
!macroend
