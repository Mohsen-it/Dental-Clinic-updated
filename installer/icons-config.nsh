; تكوين الأيقونات والصور للمثبت
; Icons and Images Configuration for Installer

; مسارات الأيقونات
!define ICON_MAIN "icon.ico"
!define ICON_UNINSTALL "icon.ico"
!define ICON_INSTALLER "icon.ico"

; صور المثبت
!define IMAGE_HEADER "assets\header.bmp"
!define IMAGE_WIZARD "assets\wizard.bmp"
!define IMAGE_BANNER "assets\banner.bmp"

; Configure main icon path for project icons
!define ICON_MAIN "$INSTDIR\assets\icon.ico"

Icon "$INSTDIR\assets\icon.ico"
UninstallIcon "$INSTDIR\assets\icon.ico"

; MUI Icons for installer interface
!define MUI_ICON "$INSTDIR\assets\icon.ico"
!define MUI_UNICON "$INSTDIR\assets\icon.ico"

; صورة الرأس
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${IMAGE_HEADER}"
!define MUI_HEADERIMAGE_UNBITMAP "${IMAGE_HEADER}"
!define MUI_HEADERIMAGE_RIGHT

; صور صفحات الترحيب والانتهاء
!define MUI_WELCOMEFINISHPAGE_BITMAP "${IMAGE_WIZARD}"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "${IMAGE_WIZARD}"

; إعدادات إضافية للصور
!define MUI_HEADERIMAGE_BITMAP_NOSTRETCH
!define MUI_WELCOMEFINISHPAGE_BITMAP_NOSTRETCH

; Function to create icons and shortcuts
Function CreateIcons
  ; Create Start Menu folder
  CreateDirectory "$SMPROGRAMS\DentalClinic - agorracode"

  ; Main program shortcut
  CreateShortCut "$SMPROGRAMS\DentalClinic - agorracode\DentalClinic - agorracode.lnk" \
                 "$INSTDIR\dentalclinic-agorracode.exe" \
                 "" \
                 "$INSTDIR\dentalclinic-agorracode.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "Comprehensive Dental Clinic Management System"

  ; Uninstall shortcut
  CreateShortCut "$SMPROGRAMS\DentalClinic - agorracode\Uninstall DentalClinic - agorracode.lnk" \
                 "$INSTDIR\uninstall.exe" \
                 "" \
                 "$INSTDIR\uninstall.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "Uninstall DentalClinic - agorracode"

  ; Help file shortcut
  CreateShortCut "$SMPROGRAMS\DentalClinic - agorracode\User Guide.lnk" \
                 "$INSTDIR\README.txt" \
                 "" \
                 "$INSTDIR\README.txt" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "User Guide and Help"

  ; Website shortcut
  WriteINIStr "$SMPROGRAMS\DentalClinic - agorracode\Website.url" \
              "InternetShortcut" \
              "URL" \
              "https://agorracode.com"

  ; Desktop shortcut
  CreateShortCut "$DESKTOP\DentalClinic - agorracode.lnk" \
                 "$INSTDIR\dentalclinic-agorracode.exe" \
                 "" \
                 "$INSTDIR\dentalclinic-agorracode.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "Comprehensive Dental Clinic Management System"

  ; Quick Launch shortcut (if available)
  CreateShortCut "$QUICKLAUNCH\DentalClinic - agorracode.lnk" \
                 "$INSTDIR\dentalclinic-agorracode.exe" \
                 "" \
                 "$INSTDIR\dentalclinic-agorracode.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "DentalClinic - agorracode"
FunctionEnd

; Function to remove icons and shortcuts
Function un.RemoveIcons
  ; Delete Start Menu shortcuts
  Delete "$SMPROGRAMS\DentalClinic - agorracode\DentalClinic - agorracode.lnk"
  Delete "$SMPROGRAMS\DentalClinic - agorracode\Uninstall DentalClinic - agorracode.lnk"
  Delete "$SMPROGRAMS\DentalClinic - agorracode\User Guide.lnk"
  Delete "$SMPROGRAMS\DentalClinic - agorracode\Website.url"
  RMDir "$SMPROGRAMS\DentalClinic - agorracode"

  ; Delete desktop shortcut
  Delete "$DESKTOP\DentalClinic - agorracode.lnk"

  ; Delete Quick Launch shortcut
  Delete "$QUICKLAUNCH\DentalClinic - agorracode.lnk"
FunctionEnd

; دالة تسجيل أنواع الملفات
Function RegisterFileTypes
  ; تسجيل امتداد .dcm (Dental Clinic Management)
  WriteRegStr HKCR ".dcm" "" "DentalClinic.DataFile"
  WriteRegStr HKCR "DentalClinic.DataFile" "" "ملف بيانات العيادة السنية"
  WriteRegStr HKCR "DentalClinic.DataFile\DefaultIcon" "" "$INSTDIR\dentalclinic-agorracode.exe,0"
  WriteRegStr HKCR "DentalClinic.DataFile\shell\open\command" "" '"$INSTDIR\dentalclinic-agorracode.exe" "%1"'
  
  ; تسجيل امتداد .dcb (Dental Clinic Backup)
  WriteRegStr HKCR ".dcb" "" "DentalClinic.BackupFile"
  WriteRegStr HKCR "DentalClinic.BackupFile" "" "ملف نسخة احتياطية للعيادة السنية"
  WriteRegStr HKCR "DentalClinic.BackupFile\DefaultIcon" "" "$INSTDIR\dentalclinic-agorracode.exe,1"
  WriteRegStr HKCR "DentalClinic.BackupFile\shell\open\command" "" '"$INSTDIR\dentalclinic-agorracode.exe" --restore "%1"'
  
  ; تحديث قاعدة بيانات الأيقونات
  System::Call 'shell32.dll::SHChangeNotify(l, l, p, p) v (0x08000000, 0, 0, 0)'
FunctionEnd

; دالة إلغاء تسجيل أنواع الملفات
Function un.UnregisterFileTypes
  ; إلغاء تسجيل امتدادات الملفات
  DeleteRegKey HKCR ".dcm"
  DeleteRegKey HKCR "DentalClinic.DataFile"
  DeleteRegKey HKCR ".dcb"
  DeleteRegKey HKCR "DentalClinic.BackupFile"
  
  ; تحديث قاعدة بيانات الأيقونات
  System::Call 'shell32.dll::SHChangeNotify(l, l, p, p) v (0x08000000, 0, 0, 0)'
FunctionEnd

; Function to create application info file
Function CreateAppInfo
  ; Create application info file
  FileOpen $0 "$INSTDIR\app-info.txt" w
  FileWrite $0 "DentalClinic - agorracode$\r$\n"
  FileWrite $0 "Version: v2.1$\r$\n"
  FileWrite $0 "Installation Date: $\r$\n"
  FileWrite $0 "Installation Folder: $INSTDIR$\r$\n"
  FileWrite $0 "Application ID: com.agorracode.dentalclinic$\r$\n"
  FileWrite $0 "Publisher: AgorraCode Team$\r$\n"
  FileWrite $0 "Website: https://agorracode.com$\r$\n"
  FileWrite $0 "Technical Support: dev@agorracode.com$\r$\n"
  FileClose $0
FunctionEnd
