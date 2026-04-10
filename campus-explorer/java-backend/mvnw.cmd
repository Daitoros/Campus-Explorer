@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM    Unless required by applicable law or agreed to in writing,
@REM    software distributed under the License is distributed on an
@REM    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM    KIND, either express or implied.  See the License for the
@REM    specific language governing permissions and limitations
@REM    under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup batch script, version 3.2.0
@REM
@REM Optional ENV vars
@REM -----------------
@REM   JAVA_HOME - location of a JDK home dir, the default is "java"
@REM   MAVEN_OPTS - parameters passed to the Java VM when running Maven
@REM     e.g. to debug Maven itself, use
@REM       set MAVEN_OPTS=-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=8000
@REM   MAVEN_SKIP_RC - flag to disable loading of mavenrc files
@REM ----------------------------------------------------------------------------

@echo off
setlocal

if not "%MAVEN_SKIP_RC%"=="" goto skipRcPre
if exist "%PROGRAMDATA%\mavenrc.cmd" call "%PROGRAMDATA%\mavenrc.cmd"
if exist "%USERPROFILE%\mavenrc.cmd" call "%USERPROFILE%\mavenrc.cmd"
:skipRcPre

@REM Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set ERROR_CODE=0

@REM To isolate internal variables from possible conflict
set CLASSWORLDS_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

@REM ==== START VALIDATION ====
if not "%JAVA_HOME%"=="" goto OkJHome

for %%i in (java.exe) do set "JAVACMD=%%~$PATH:i"
if not "%JAVACMD%"=="" goto OkJHome

echo.
echo Error: JAVA_HOME is not defined correctly.
echo   We cannot execute %JAVACMD%
echo.
goto error

:OkJHome
if "%JAVACMD%"=="" set JAVACMD=%JAVA_HOME%\bin\java.exe

if exist "%JAVACMD%" goto chkMHome

echo.
echo Error: JAVA_HOME is set to an invalid directory.
echo   JAVA_HOME = "%JAVA_HOME%"
echo   Please set the JAVA_HOME variable in your environment to match the
echo   location of your Java installation.
echo.
goto error

:chkMHome
set "MAVEN_PROJECTBASEDIR=%~dp0"
if not "%MAVEN_PROJECTBASEDIR:~-1%"=="\" set "MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR%\"

set WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_PROPERTIES="%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.properties"

@REM Download the wrapper jar if it doesn't exist
if exist %WRAPPER_JAR% goto run

echo Couldn't find %WRAPPER_JAR%, downloading it...

@REM Read wrapperUrl from properties
for /f "tokens=2 delims==" %%i in ('findstr /i "wrapperUrl" %WRAPPER_PROPERTIES%') do set WRAPPER_URL=%%i

if "%WRAPPER_URL%"=="" set WRAPPER_URL=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar

@REM Use PowerShell to download the jar
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%WRAPPER_URL%', %WRAPPER_JAR%) }"

if not exist %WRAPPER_JAR% (
    echo Error: Failed to download Maven Wrapper jar.
    goto error
)

:run
"%JAVACMD%" ^
  %MAVEN_OPTS% ^
  -classpath %WRAPPER_JAR% ^
  "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" ^
  %CLASSWORLDS_LAUNCHER% ^
  %*
if ERRORLEVEL 1 goto error
goto end

:error
set ERROR_CODE=1

:end
@REM set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" endlocal

exit /B %ERROR_CODE%
