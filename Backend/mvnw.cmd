@ECHO OFF
SETLOCAL

SET WRAPPER_DIR=%~dp0.mvn\wrapper
SET WRAPPER_JAR=%WRAPPER_DIR%\maven-wrapper.jar
SET WRAPPER_PROPERTIES=%WRAPPER_DIR%\maven-wrapper.properties
SET WRAPPER_MAIN=org.apache.maven.wrapper.MavenWrapperMain

IF NOT EXIST "%WRAPPER_PROPERTIES%" (
  ECHO ERROR: %WRAPPER_PROPERTIES% not found.
  EXIT /B 1
)

IF NOT EXIST "%WRAPPER_JAR%" (
  FOR /F "tokens=2 delims==" %%F IN ('findstr /R /C:"^wrapperUrl=" "%WRAPPER_PROPERTIES%"') DO SET WRAPPER_URL=%%F
  IF "%WRAPPER_URL%"=="" (
    ECHO ERROR: wrapperUrl not set in %WRAPPER_PROPERTIES%
    EXIT /B 1
  )
  powershell -NoProfile -ExecutionPolicy Bypass -Command "(New-Object Net.WebClient).DownloadFile('%WRAPPER_URL%', '%WRAPPER_JAR%')"
)

IF NOT DEFINED JAVA_HOME (
  java -classpath "%WRAPPER_JAR%" -Dmaven.multiModuleProjectDirectory="%~dp0" %WRAPPER_MAIN% %*
) ELSE (
  "%JAVA_HOME%\bin\java" -classpath "%WRAPPER_JAR%" -Dmaven.multiModuleProjectDirectory="%~dp0" %WRAPPER_MAIN% %*
)

ENDLOCAL
