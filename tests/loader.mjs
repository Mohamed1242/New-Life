import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(rootDir, "src");

function tryFile(candidate) {
  for (const ext of ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.js"]) {
    const full = candidate + ext;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return pathToFileURL(full).href;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // Stub native Expo/RN packages when importing pure logic modules under Node test runner
  if (
    specifier === "react-native" ||
    specifier === "expo-notifications" ||
    specifier === "expo-modules-core" ||
    specifier === "expo-constants" ||
    specifier === "expo-device" ||
    specifier === "@react-native-async-storage/async-storage" ||
    specifier === "@react-native-community/netinfo" ||
    specifier.endsWith(".wav")
  ) {
    return {
      shortCircuit: true,
      url: "data:text/javascript,export const Platform={OS:'ios'};export const ExecutionEnvironment={StoreClient:'storeClient'};export default {Platform,ExecutionEnvironment};export function requireOptionalNativeModule(){return null;}export const SchedulableTriggerInputTypes={DATE:'date',DAILY:'daily',TIME_INTERVAL:'timeInterval'};export const AndroidImportance={MAX:5,HIGH:4,DEFAULT:3};export async function getPermissionsAsync(){return {status:'denied'};}export async function requestPermissionsAsync(){return {status:'denied'};}export async function setNotificationChannelAsync(){}",
    };
  }

  if (specifier.startsWith("@/")) {
    const target = path.join(srcDir, specifier.slice(2));
    const resolved = tryFile(target);
    if (resolved) return { shortCircuit: true, url: resolved };
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:")
  ) {
    const parentPath = path.dirname(fileURLToPath(context.parentURL));
    const resolved = tryFile(path.resolve(parentPath, specifier));
    if (resolved) return { shortCircuit: true, url: resolved };
  }

  return nextResolve(specifier, context);
}
