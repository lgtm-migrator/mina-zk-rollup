import { CloudAPI, Instance } from './api.js';
import { Provider, Credentials } from './provider.js';

import {
  DescribeInstancesCommand,
  EC2Client,
  RebootInstancesCommand,
  RunInstancesCommand,
  RunInstancesCommandInput,
  StartInstancesCommand,
  StartInstancesCommandInput,
  StopInstancesCommand,
  TerminateInstancesCommand,
} from '@aws-sdk/client-ec2';

let DryRun = process.env.AWS_DRY_RUN == 'true' ? true : false;

const DEPLOY_SCRIPT = Buffer.from(
  `#!/bin/bash
cd $HOME
cd ..
sudo touch HELLO_WORLD.txt
sudo echo "IT WORKED" > HELLO_WORLD.txt`
).toString('base64');

export class AWS extends Provider implements CloudAPI {
  client: EC2Client;

  constructor(c: Credentials | undefined, region: Region = Region.US_EAST_1) {
    super(c);
    this.client = new EC2Client({
      region,
      apiVersion: '2016-11-15',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  async rebootInstance(instances: Instance[]): Promise<void> {
    var params = {
      InstanceIds: instances.map((i) => i.id),
      DryRun,
    };
    try {
      let res = await this.client.send(new RebootInstancesCommand(params));
      console.log(res);
    } catch (err) {
      console.log('Error', err);
      throw err;
    }
  }

  async listAll(alive: boolean = false): Promise<Instance[]> {
    var params = {
      DryRun,
    };
    let instances: Instance[] = [];

    try {
      let res = await this.client.send(new DescribeInstancesCommand(params));

      res.Reservations?.forEach((res) => {
        res.Instances?.forEach((instance) => {
          if (alive && instance.State!.Name! == 'terminated') return;
          instances.push({
            id: instance.InstanceId!,
            ip: instance.PublicIpAddress!,
            status: instance.State!.Name!,
          });
        });
      });
    } catch (err) {
      console.log('Error', err);
      throw err;
    }
    return instances;
  }

  async terminateInstance(instances: Instance[]): Promise<void> {
    var params = {
      InstanceIds: instances.map((i) => i.id),
      DryRun,
    };
    try {
      await this.client.send(new TerminateInstancesCommand(params));
    } catch (err) {
      console.log('Error', err);
      throw err;
    }
  }

  async stopInstances(instances: Instance[]): Promise<void> {
    var params = {
      InstanceIds: instances.map((i) => i.id),
      DryRun,
    };
    try {
      let res = await this.client.send(new StopInstancesCommand(params));
      console.log(res);
    } catch (err) {
      console.log('Error', err);
      throw err;
    }
  }

  async startInstance(instances: Instance[]): Promise<void> {
    var params: StartInstancesCommandInput = {
      InstanceIds: instances.map((i) => i.id),
      DryRun,
    };
    try {
      let res = await this.client.send(new StartInstancesCommand(params));
      console.log(res);
    } catch (err) {
      console.log('Error', err);
      throw err;
    }
  }

  async createInstance(
    amount: number = 1,
    instanceType: string = 't2.micro'
  ): Promise<Instance> {
    const instanceParams: RunInstancesCommandInput = {
      ImageId: 'ami-05fa00d4c63e32376', //AMI_ID
      InstanceType: instanceType,
      MinCount: 1,
      MaxCount: amount,
      DryRun,
      SecurityGroupIds: ['sg-0169ee29fbc5e8569'],
      UserData: DEPLOY_SCRIPT,
      KeyName: 'main',
    };
    try {
      const data = await this.client.send(
        new RunInstancesCommand(instanceParams)
      )!;
      //console.log(JSON.stringify(data));
      return {
        id: data.Instances![0].InstanceId!,
        ip: data.Instances![0].PublicIpAddress ?? 'u',
        status: data.Instances![0].State?.Name?.toString() ?? 'pending',
      };
    } catch (err) {
      console.log('Error', err);
      throw err;
    }
  }
}

export enum Region {
  US_EAST_1 = 'us-east-1',
}
