from rest_framework import serializers

from .models import ProjectFile, LambdaInstance, Server, PrivateNetwork
from .models import Application, LambdaInstance, Server, PrivateNetwork

class ApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ('uuid', 'name', 'path', 'description', 'failure_message', 'status')


class ServerSerializer(serializers.ModelSerializer):
    """
    A serializer for Server objects.
    """

    class Meta:
        model = Server
        fields = ('id', 'hostname', 'cpus', 'ram', 'disk', 'pub_ip', 'pub_ip_id', 'priv_ip')


class PrivateNetworkSerializer(serializers.ModelSerializer):
    """
    A serializer for PrivateNetwork objects.
    """

    class Meta:
        model = PrivateNetwork
        fields = ('id', 'subnet', 'gateway')


class LambdaInstanceSerializer(serializers.ModelSerializer):
    """
    A serializer for LambdaInstance objects.
    """

    servers = ServerSerializer(many=True, read_only=True)
    private_network = PrivateNetworkSerializer(many=True, read_only=True)

    class Meta:
        model = LambdaInstance
        fields = ('id', 'uuid', 'name', 'instance_info', 'status', 'failure_message', 'servers',
                  'private_network')


class LambdaInstanceInfo(serializers.Serializer):
    instance_name = serializers.CharField()
    master_name = serializers.CharField()
    project_name = serializers.CharField()
    ip_allocation = serializers.CharField()
    slaves = serializers.IntegerField()
    vcpus_master = serializers.IntegerField()
    vcpus_slave = serializers.IntegerField()
    ram_master = serializers.IntegerField()
    ram_slave = serializers.IntegerField()
    disk_master = serializers.IntegerField()
    disk_slave = serializers.IntegerField()
    network_request = serializers.IntegerField()

    allowed = {
        "vcpus": {8, 1, 2, 4},
        "disks": {100, 5, 40, 10, 80, 20, 60},
        "ram":   {1024, 2048, 4096, 6144, 8192, 512},
        "disk":  {u'drbd', u'ext_vlmc'}
    }

    def validate(self, data):
        if data['vcpus_master'] not in self.allowd['vcpus']:
            raise serializers.ValidationError("Wrong Number of master vcpus")
        if data['vcpus_slave'] not in self.allowd['vcpus']:
            raise serializers.ValidationError("Wrong Number of slave vcpus")
        if data['ram_master'] not in self.allowd['ram']:
            raise serializers.ValidationError("Wrong amount of master ram")
        if data['ram_slave'] not in self.allowd['ram']:
            raise serializers.ValidationError("Wrong amount of slave ram")
        if data['disk_master'] not in self.allowd['disk']:
            raise serializers.ValidationError("Wrong size of master disk")
        if data['disk_slave'] not in self.allowd['disk']:
            raise serializers.ValidationError("Wrong size of slave disk")

