; English Installer Customization for Dental Clinic Management System
; Dental Clinic Management AgorraCode Installer

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"
!include "FileFunc.nsh"
!include "icons-config.nsh"
!include "modern-ui.nsh"
!include "theme-config.nsh"

; Define Variables
!define PRODUCT_NAME "DentalClinic - agorracode"
!define PRODUCT_VERSION "2.1"
!define PRODUCT_PUBLISHER "AgorraCode"
!define PRODUCT_WEB_SITE "https://agorracode.com"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\dentalclinic-agorracode.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

; General Settings
Name "${PRODUCT_NAME}"
OutFile "DentalClinic-agorracode-v${PRODUCT_VERSION}-Setup.exe"
InstallDir "$PROGRAMFILES\${PRODUCT_NAME}"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

; Modern UI Settings
!define MUI_ABORTWARNING
!define MUI_ICON "$INSTDIR\assets\icon.ico"
!define MUI_UNICON "$INSTDIR\assets\icon.ico"

; Welcome Page
!define MUI_WELCOMEPAGE_TITLE "Welcome to ${PRODUCT_NAME} Setup Wizard"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of ${PRODUCT_NAME}.$\r$\n$\r$\nIt is recommended that you close all other applications before continuing. This will make it possible to update relevant system files without having to reboot your computer.$\r$\n$\r$\nClick Next to continue."

; License Page
!define MUI_LICENSEPAGE_TEXT_TOP "Please review the license terms before installing ${PRODUCT_NAME}."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "If you accept the terms of the agreement, click I Agree to continue. You must accept the agreement to install ${PRODUCT_NAME}."
!define MUI_LICENSEPAGE_BUTTON "&I Agree"

; Components Page
!define MUI_COMPONENTSPAGE_TITLE "Choose Installation Components for ${PRODUCT_NAME}"
!define MUI_COMPONENTSPAGE_TEXT "Please select the components you want to install. You can choose to install all components or select specific components.$\r$\n$\r$\nClick Next to continue."
!define MUI_COMPONENTSPAGE_GROUP "${PRODUCT_NAME} Components"

; Directory Page
!define MUI_DIRECTORYPAGE_TEXT_TOP "Setup will install ${PRODUCT_NAME} in the following folder.$\r$\n$\r$\nTo install in a different folder, click Browse and select another folder. Click Next to continue."
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Destination Folder"

; Installation Page
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "Installation Complete"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "${PRODUCT_NAME} has been installed successfully."
!define MUI_INSTFILESPAGE_ABORTHEADER_TEXT "Installation Aborted"
!define MUI_INSTFILESPAGE_ABORTHEADER_SUBTEXT "Installation was not completed."

; Finish Page
!define MUI_FINISHPAGE_TITLE "${PRODUCT_NAME} Installation Complete"
!define MUI_FINISHPAGE_TEXT "${PRODUCT_NAME} has been installed on your computer.$\r$\n$\r$\nClick Finish to close this wizard."
!define MUI_FINISHPAGE_RUN "$INSTDIR\dentalclinic-agorracode.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Run ${PRODUCT_NAME}"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Show README file"

; Installer Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "license-en.txt"
!insertmacro MUI_PAGE_COMPONENTS
!define MUI_PAGE_CUSTOMFUNCTION_PRE DirectoryPre
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE DirectoryLeave
!define MUI_PAGE_CUSTOMFUNCTION_SHOW DirectoryShow
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!define MUI_UNWELCOMEPAGE_TEXT "This wizard will guide you through the uninstallation of ${PRODUCT_NAME}.$\r$\n$\r$\nBefore starting the uninstallation, make sure ${PRODUCT_NAME} is not running.$\r$\n$\r$\nClick Next to continue."
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Version Information
VIProductVersion "2.1.0.0"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "Comments" "Comprehensive Dental Clinic Management System"
VIAddVersionKey /LANG=${LANG_ENGLISH} "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "LegalTrademarks" "${PRODUCT_NAME} is a trademark of ${PRODUCT_PUBLISHER}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "LegalCopyright" "© ${PRODUCT_PUBLISHER}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileDescription" "${PRODUCT_NAME}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileVersion" "${PRODUCT_VERSION}"

; Main Installation Function
Section "Main Program" SEC_MAIN
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  File /r "${BUILD_RESOURCES_DIR}\*.*"
SectionEnd

Section "Help Files" SEC_HELP
  SetOutPath "$INSTDIR"
  File "README-ar.txt"
  File "user-guide-ar.md"
SectionEnd

Section "Desktop Shortcuts" SEC_DESKTOP
  Call CreateIcons
SectionEnd

; Register File Types
Section -RegisterFileTypes
  Call RegisterFileTypes
SectionEnd

; Create Application Info
Section -AppInfo
  Call CreateAppInfo
SectionEnd

; Uninstall Function
Section Uninstall
  Call un.RemoveIcons
  Call un.UnregisterFileTypes
  ; Delete shortcuts
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall ${PRODUCT_NAME}.lnk"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"

  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"

  ; Delete files
  RMDir /r "$INSTDIR"

  ; Delete registry keys
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"

  SetAutoClose true
SectionEnd

; Initialization Function
Function .onInit
  ; Set default language to English
  StrCpy $LANGUAGE ${LANG_ENGLISH}
  Call ApplyModernTheme
  Call SetDefaultInstallDir
FunctionEnd

; Function to set default installation directory with automatic folder creation
Function SetDefaultInstallDir
  ; Set default installation directory
  StrCpy $INSTDIR "$PROGRAMFILES\${PRODUCT_NAME}"
FunctionEnd

; Function to customize directory page behavior and force enable Install button
Function DirectoryShow
  ; Force enable the Next/Install button regardless of directory selection
  ; Try multiple methods to ensure the button is always enabled

  ; Method 1: Standard Next button
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 1

  ; Method 2: Try common button IDs
  GetDlgItem $0 $HWNDPARENT 2
  EnableWindow $0 1

  ; Method 3: Directory page specific button
  FindWindow $1 "#32770" "" $HWNDPARENT  ; Find dialog
  GetDlgItem $0 $1 1
  EnableWindow $0 1

  ; Method 4: Update the path immediately when page is shown
  Call UpdateInstallDirFromSelection

  ; Method 5: Set up continuous monitoring and updating
  Call EnableInstallButtonTimer
  Call SetupDirectoryAutoUpdate
FunctionEnd

; Function to set up a timer that keeps the Install button enabled and updates path
Function EnableInstallButtonTimer
  ; Create a timer that calls our enable function every 50ms
  GetDlgItem $0 $HWNDPARENT 0
  GetFunctionAddress $1 ForceEnableButtonAndUpdatePath
  ; Note: SetTimer might not work in all NSIS versions, so we'll use a simpler approach
  ; Just force enable the button multiple times and update path
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 1
  GetDlgItem $0 $HWNDPARENT 2
  EnableWindow $0 1

  ; Also update the path immediately
  Call UpdateInstallDirFromSelection
FunctionEnd

; Function to force enable the button and update path (called by timer)
Function ForceEnableButtonAndUpdatePath
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 1

  ; Update installation directory based on current selection
  Call UpdateInstallDirFromSelection
FunctionEnd

; Function to set up automatic directory path updating
Function SetupDirectoryAutoUpdate
  ; Get the directory text field handle
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $1 $0 1019  ; Directory text field ID

  ; Set up monitoring for text changes
  ; We'll use a simple approach - check periodically
  Call UpdateInstallDirFromSelection

  ; Start continuous monitoring
  Call StartDirectoryMonitorTimer
FunctionEnd

; Function to start monitoring timer for directory changes
Function StartDirectoryMonitorTimer
  ; Create a background monitoring process
  ; This will run multiple update cycles to catch user input
  Call ContinuousDirectoryMonitor
FunctionEnd

; Function for continuous directory monitoring
Function ContinuousDirectoryMonitor
  ; Store the last known path to detect changes
  Push $R8
  StrCpy $R8 $INSTDIR

  ; Monitor for changes (simplified approach)
  Call UpdateInstallDirFromSelection

  ; Check if path changed and update accordingly
  StrCmp $R8 $INSTDIR 0 +2
  Call ForceEnableInstallButton

  Pop $R8
FunctionEnd

; Function to force enable install button
Function ForceEnableInstallButton
  ; Enable the Next/Install button
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 1

  ; Also enable other potential button IDs
  GetDlgItem $0 $HWNDPARENT 2
  EnableWindow $0 1
FunctionEnd

; Function to update installation directory based on current selection
Function UpdateInstallDirFromSelection
  Push $R0
  Push $R1
  Push $R2
  Push $R3
  Push $R4

  ; Get current directory from the text field
  FindWindow $R0 "#32770" "" $HWNDPARENT
  GetDlgItem $R1 $R0 1019  ; Directory text field ID

  ; Skip if we can't find the text field
  IntCmp $R1 0 update_done

  ; Get the text from the directory field
  System::Call "user32::GetWindowText(i $R1, t .r2, i 1024)"
  StrCpy $R2 $2

  ; Skip if empty or unchanged
  StrCmp $R2 "" update_done
  StrCmp $R2 $INSTDIR update_done  ; No change needed

  ; Store original path for comparison
  StrCpy $R4 $R2

  ; Simple trim of trailing spaces and backslashes for consistency
  StrCpy $R3 $R2 1 -1
  StrCmp $R3 " " 0 +3
  StrLen $R3 $R2
  IntOp $R3 $R3 - 1
  StrCpy $R2 $R2 $R3

  ; Check if user selected only a drive (like C: or C:\)
  StrLen $R1 $R2
  IntCmp $R1 3 is_drive_only_check
  IntCmp $R1 2 is_drive_only_no_slash_check
  Goto check_if_needs_product_name

  is_drive_only_no_slash_check:
    ; Add backslash if missing (e.g., "C:" -> "C:\")
    StrCpy $R2 "$R2\"
  is_drive_only_check:
    ; If user selected only a drive, append the product name
    StrCpy $R3 "$R2${PRODUCT_NAME}"
    Goto update_field

  check_if_needs_product_name:
    ; Check if the path already ends with the product name
    StrLen $R1 "${PRODUCT_NAME}"
    StrLen $R0 $R2
    IntCmp $R0 $R1 check_exact_match  ; Same length, check if exact match
    IntCmp $R0 $R1 update_done check_suffix  ; Shorter than product name, skip

  check_suffix:
    ; Check if path ends with product name
    IntOp $R0 $R0 - $R1
    StrCpy $R1 $R2 "" $R0
    StrCmp $R1 "${PRODUCT_NAME}" update_done  ; Already ends with product name

    ; Check if we need to add product name
    StrCpy $R1 $R2 1 -1
    StrCmp $R1 "\" append_product_name
    ; Add backslash and product name
    StrCpy $R3 "$R2\${PRODUCT_NAME}"
    Goto update_field

  check_exact_match:
    ; Check if the path is exactly the product name
    StrCmp $R2 "${PRODUCT_NAME}" update_done
    Goto check_if_needs_product_name

  append_product_name:
    ; Just append product name (path already ends with backslash)
    StrCpy $R3 "$R2${PRODUCT_NAME}"

  update_field:
    ; Only update if the new path is different from current
    StrCmp $R3 $R4 update_done

    ; Update the directory field with the new path
    FindWindow $R0 "#32770" "" $HWNDPARENT
    GetDlgItem $R1 $R0 1019  ; Directory text field ID
    System::Call "user32::SetWindowText(i $R1, t '$R3')"

    ; Also update INSTDIR variable
    StrCpy $INSTDIR $R3

    ; Force enable the install button
    GetDlgItem $R0 $HWNDPARENT 1
    EnableWindow $R0 1

  update_done:
    Pop $R4
    Pop $R3
    Pop $R2
    Pop $R1
    Pop $R0
FunctionEnd

; Function to handle directory page events and real-time updates
Function DirectoryPre
  ; This function is called before showing the directory page
  ; Initialize the directory with proper default
  Call SetupInitialDirectory
FunctionEnd

; Function to set up initial directory with automatic path completion
Function SetupInitialDirectory
  ; Set a reasonable default if INSTDIR is not set properly
  StrCmp $INSTDIR "" 0 +2
  StrCpy $INSTDIR "$PROGRAMFILES\${PRODUCT_NAME}"

  ; Update the directory field immediately
  Call UpdateInstallDirFromSelection
FunctionEnd

; Function to ensure proper directory structure before installation
Function DirectoryLeave
  ; Always ensure the installation goes to the correct subfolder
  Push $R0
  Push $R1
  Push $R2

  ; Get the selected directory
  StrCpy $R0 $INSTDIR

  ; Check if user selected only a drive (like C:)
  StrLen $R1 $R0
  IntCmp $R1 3 is_drive_only
  IntCmp $R1 2 is_drive_only_no_slash
  Goto check_product_name

  is_drive_only_no_slash:
    ; Add backslash if missing (e.g., "C:" -> "C:\")
    StrCpy $R0 "$R0\"
  is_drive_only:
    ; If user selected only a drive, append the product name
    StrCpy $INSTDIR "$R0${PRODUCT_NAME}"
    Goto create_dir

  check_product_name:
    ; Check if the path already contains the product name
    StrLen $R2 "${PRODUCT_NAME}"
    IntOp $R1 $R1 - $R2
    IntCmp $R1 0 create_dir
    StrCpy $R2 $R0 "" $R1
    StrCmp $R2 "${PRODUCT_NAME}" create_dir

    ; If not, append product name to the selected path
    StrCpy $INSTDIR "$R0\${PRODUCT_NAME}"

  create_dir:
    ; Always create the directory structure to ensure it exists
    CreateDirectory $INSTDIR

    ; Ensure the directory was created successfully
    IfFileExists $INSTDIR directory_ok
    MessageBox MB_OK|MB_ICONSTOP "Cannot create installation directory: $INSTDIR"
    Abort

  directory_ok:
    ; Directory is ready for installation
    ; Force enable the Next button one more time before leaving
    GetDlgItem $R0 $HWNDPARENT 1
    EnableWindow $R0 1

  Pop $R2
  Pop $R1
  Pop $R0
FunctionEnd

Function un.onInit
  StrCpy $LANGUAGE ${LANG_ENGLISH}
FunctionEnd
