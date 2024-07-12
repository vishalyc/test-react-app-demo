import * as CDK from '@aws-cdk/core'
import * as CodeBuild from '@aws-cdk/aws-codebuild'
import * as S3 from '@aws-cdk/aws-s3'
import * as CodePipeline from '@aws-cdk/aws-codepipeline'
import * as CodePipelineAction from '@aws-cdk/aws-codepipeline-actions'

export interface PipelineProps extends CDK.StackProps {
  github: {
    owner: string
    repository: string
  }
}

export class Pipeline extends CDK.Stack {
  constructor(scope: CDK.App, id: string, props: PipelineProps) {
    super(scope, id, props)

    // Amazon S3 bucket to store website
    const bucketWebsite = new S3.Bucket(this, 'react-app-cicd-demo', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      versioned: true,
      publicReadAccess: false,
    })

    // AWS CodeBuild artifacts
    const outputSources = new CodePipeline.Artifact()
    const outputWebsite = new CodePipeline.Artifact()

    // AWS CodePipeline pipeline
    const pipeline = new CodePipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'react-app-cicd-demo',
      restartExecutionOnUpdate: true,
    })

    // AWS CodePipeline stage to clone sources from GitHub repository
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new CodePipelineAction.CodeStarConnectionsSourceAction({
          actionName: "Github_Source",
          owner: "vishalyc",
          repo: "react-app",
          branch: "main",
          output: outputSources,
          connectionArn: "arn:aws:codeconnections:us-east-1:537761441911:connection/4b2d9fa3-2410-46c3-8e50-b2b35d95fcf8"
        }),
      ],
    })

    // AWS CodePipeline stage to build CRA website and CDK resources
    pipeline.addStage({
      stageName: 'Build',
      actions: [
        // AWS CodePipeline action to run CodeBuild project
        new CodePipelineAction.CodeBuildAction({
          actionName: 'Build',
          project: new CodeBuild.PipelineProject(this, 'BuildWebsite', {
            environment: {
              buildImage: CodeBuild.LinuxBuildImage.AMAZON_LINUX_2_2,
              privileged: true,
              computeType: CodeBuild.ComputeType.SMALL
            },
            projectName: 'react-app-cicd-demo',
            buildSpec: CodeBuild.BuildSpec.fromSourceFilename('./infra/buildspec.yml'),
          }),
          input: outputSources,
          outputs: [outputWebsite],
        }),
      ],
    })

    // AWS CodePipeline stage to deployt CRA website and CDK resources
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        // AWS CodePipeline action to deploy CRA website to S3
        new CodePipelineAction.S3DeployAction({
          actionName: 'Deploy',
          input: outputWebsite,
          bucket: bucketWebsite,
        }),
      ],
    })

    /*new CDK.CfnOutput(this, 'WebsiteURL', {
      value: bucketWebsite.bucketWebsiteUrl,
      description: 'Website URL',
    })*/
  }
}
