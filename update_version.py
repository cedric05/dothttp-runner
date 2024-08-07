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
    dotextensions_version = f"{args.dotextensions_version}a{args.alpha}"
    # below is semver version
    dotextensions_semver = f"{args.dotextensions_version}-alpha.{args.alpha}"
    dothttp_runner_version = args.dothttp_runner_version

    data["availableversions"].append(
        {
            "downloadUrls": {
                "linux_arm64": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-linux-arm64.zip",
                "linux_amd64": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-linux-amd64.zip",
                "linux": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-linux-amd64.zip",
                "windows": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-x86-windows.zip",
                "darwin": f"https://github.com/cedric05/dotextensions-build/releases/download/v-{dotextensions_version}/dotextensions-{dotextensions_version}-darwin.zip",
            },
            "latest": not args.no_latest,
            "stable": not args.no_stable,
            "version": dotextensions_semver,
        }
    )
    data["matrix"][dothttp_runner_version] = {
        "maxVersion": args.dotextensions_version,
        "minVersion": "0.0.8",
    }

    with open("version.json", "w") as f:
        json.dump(data, f, indent=4)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Update version matrix in version.json"
    )
    parser.add_argument("--dotextensions_version", help="dotextensions version")
    parser.add_argument("--alpha", help="dothttp alpha version")
    parser.add_argument("--dothttp_runner_version", help="dothttp-runner version")
    parser.add_argument(
        "--no_latest",  help="is latest version", default=False, required=False, action='store_true'
    )
    parser.add_argument(
        "--no_stable",  help="is stable version", default=False, required=False, action='store_true'
    )
    args = parser.parse_args()
    main(args)
