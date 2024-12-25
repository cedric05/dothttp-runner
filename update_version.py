# create new version matrix in version.json
# Usage: python update_version.py <version> <version.json>
# Description: This script will update the version matrix in version.json

import sys
import json
import argparse


def main(args):
    with open("version.json") as f:
        data = json.load(f)

    # python version type follows below pattern
    if args.alpha:
        dotextensions_version = f"{args.dotextensions_version}a{args.alpha}"
        # below is semver version
        dotextensions_semver = f"{args.dotextensions_version}-alpha.{args.alpha}"
    else:
        dotextensions_version = f"{args.dotextensions_version}"
        # below is semver version
        dotextensions_semver = f"{args.dotextensions_version}"
    dothttp_runner_version = args.dothttp_runner_version
    dothttp_extensions_min_version = args.dothttp_extensions_min_version

    print(f'dotextensions_version: {dotextensions_version}')
    print(f'dotextensions_semver: {dotextensions_semver}')
    print(f'dothttp_runner_version: {dothttp_runner_version}')
    print(f'dothttp_extensions_min_version: {dothttp_extensions_min_version}')
    
    # before appending check if version already exists
    version_present_in_availableversions = False
    for version_info in data["availableversions"]:
        if version_info["version"] == dotextensions_semver:
            print(f"version {dotextensions_semver} already exists in version.json")
            version_present_in_availableversions = True
            break
    if not version_present_in_availableversions:
        data["availableversions"].append(
            {
                "downloadUrls": {
                    "linux_arm64": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-linux-arm64.zip",
                    "linux_amd64": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-linux-amd64.zip",
                    "linux": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-linux-amd64.zip",
                    "windows": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-x86-windows.zip",
                    "darwin": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-darwin.zip",
                    "darwin_arm64": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-darwin-arm.zip",
                    "darwin_amd64": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-darwin.zip",
                },
                "latest": not args.no_latest,
                "stable": not args.no_stable,
                "version": dotextensions_semver,
            }
        )
    if not dothttp_extensions_min_version:
        last_version_name = list(data["matrix"].keys())[-1]
        dothttp_extensions_min_version = data["matrix"][last_version_name]["minVersion"]
    
    data["matrix"][dothttp_runner_version] = {
        "maxVersion": args.dotextensions_version,
        "minVersion": dothttp_extensions_min_version,
    }

    print(f"updated matrix: {data}")

    with open("version.json", "w") as f:
        json.dump(data, f, indent=4)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Update version matrix in version.json"
    )
    parser.add_argument("--dotextensions_version", help="dotextensions version")
    parser.add_argument("--alpha", help="dothttp alpha version", default="")
    parser.add_argument("--dothttp_runner_version", help="dothttp-runner version")
    parser.add_argument(
        "--no_latest",  help="is latest version", default=False, required=False, action='store_true'
    )
    parser.add_argument(
        "--no_stable",  help="is stable version", default=False, required=False, action='store_true'
    )
    parser.add_argument(
        "--dothttp_extensions_min_version", help="dothttp extensions min version", required=False,
    )
    args = parser.parse_args()
    main(args)
