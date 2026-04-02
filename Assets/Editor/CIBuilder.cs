using UnityEngine;
using UnityEditor;
using System.Linq;
using System.IO;
using System;
using PlasticPipe.PlasticProtocol.Messages;
using Unity.IO.LowLevel.Unsafe;

public class CIBuilder
{
    [MenuItem("CI/BuildWebGL")]
    public static void PerformWebGLBuild()
    {
        try
        {
            string[] scenes = EditorBuildSettings.scenes
                .Where(s => s.enabled)
                .Select(s => s.path)
                .ToArray();

            if (scenes.Length == 0)
            {
                Debug.LogError("No scenes are added to the build.");
                return;
            }

            string buildPath = "Builds/WebGL";
            if (!Directory.Exists(buildPath))
            {
                Directory.CreateDirectory(buildPath);
                Debug.Log($"Created Directory at {buildPath}");
            }

            // set how we are going to make the build
            BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions();
            buildPlayerOptions.scenes = scenes;                 // pass scenes
            buildPlayerOptions.locationPathName = buildPath;    // where to build 
            buildPlayerOptions.target = BuildTarget.WebGL;      // Target platform use stuff we have for web
            buildPlayerOptions.options = BuildOptions.None;     // extra stuff

            UnityEditor.Build.Reporting.BuildReport report = BuildPipeline.BuildPlayer(buildPlayerOptions);
            UnityEditor.Build.Reporting.BuildSummary summary = report.summary;

            if (summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
            {
                Debug.Log($"Build Succeeded. {summary.totalSize} bytes written");
            }
            else if (summary.result == UnityEditor.Build.Reporting.BuildResult.Failed)
            {
                Debug.Log($"Build Failed with. {summary.totalErrors} errors");
            }
        }
        catch (Exception e)
        {
            Debug.Log($"Critical error {e.Message}");
        }
    }
}
