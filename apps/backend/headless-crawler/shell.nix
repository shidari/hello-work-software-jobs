{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "cdk-shell";

  buildInputs = [
    pkgs.nodejs_22
    pkgs.awscli2
    pkgs.aws-vault
    pkgs.pnpm
  ];

  shellHook = ''
    echo "Use 'pnpm install' to manage dependencies"
  '';
}
