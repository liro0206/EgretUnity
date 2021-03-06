﻿///<reference path="freenode.ts" />


namespace FreeNode.ForEgret3D
{

    export class Entity_Empty extends egret3d.Entity
    {
        uuid: number;
        fullname: string;
        //empty 节点 是无法拥有update的
    }
    export class Entity_Mesh extends egret3d.Mesh
    {
        constructor()
        {
            super(new egret3d.SubGeometry(), new egret3d.TextureMaterial());
        }
        uuid: number;
        fullname: string;
        comps: Array<{}> = [];//记录组件信息
        skiprender: boolean = false;
        update(camera: egret3d.Camera3D, time: number, delay: number): void
        {
            if (!this.skiprender)
            {
                super.update(camera, time, delay);
            }
            else
            {
                this.isVisible = false;
                if (this.animation != null)
                    this.animation.updata(time, delay);
            }
        }
    }
    export class Parser implements FreeNode.IParser
    {
        constructor(view: egret3d.View3D, lightGroup: egret3d.LightGroup)
        {
            this.view = view;
            this.lightGroup = lightGroup;
            this.delaycall = [];
            this.mapNode = {};
        }
        delaycall: Array<Function>;
        mapNode: { [id: number]: (Entity_Empty | Entity_Mesh) };
        view: egret3d.View3D;
        lightGroup: egret3d.LightGroup;
        ParseNode(parser: FreeNode.SceneParser, json: {}, parent: any): any//处理节点
        {
         
            //判断是否是mesh组件
            var components = <[]>json["components"];
            var ismesh = false;
            var needupdate = false;

            if (components != undefined)
            {
                for (var i in components)
                {
                    if (components[i]["type"] == "meshfilter" || components[i]["type"] == "skinnedmeshrenderer")
                    {
                        ismesh = true;
                    }
                    if (components[i]["type"] == "aniplayer")
                    {
                        needupdate = true;
                    }
                }
            }

            var n: any = null;
            if (ismesh == true)
            {
                n = new Entity_Mesh();
            }
            else if (needupdate == true)
            {
                n = new Entity_Mesh();
                //n.geometry = new egret3d.CubeGeometry(1, 1, 1);
                n.skiprender = true;
            }
            else
            {

                n = new Entity_Empty();

            }
            n.name = json["name"];
            n.uuid = json["id"];
            if (parent != null)
            {
                var pobj = <egret3d.Object3D>parent;
                pobj.addChild(n);
                if (n.parent instanceof (Entity_Empty) || n.parent instanceof (Entity_Mesh))
                {
                    n.fullname = n.parent.fullname + "/" + n.name;
                }
                else
                {
                    n.fullname = n.name;
                }
            }
            else
            {
                n.fullname = n.name;
                this.view.root.addChild(n);
            }
            this.mapNode[n.uuid] = n;
            console.log("parseNode:" + n.fullname + "|" + n.uuid + " ismesh:" + ismesh);

            return n;
        }
        ParseComponent(parser: FreeNode.SceneParser, json: {}, box: FreeNode.StreamBox, parent: any): any//处理组件
        {
            if (json["type"] == "transform")
            {
                this._parseTransform(json, box, parent);
            }
            else if (json["type"] == "meshfilter")
            {
                this._parseMeshFilter(json, box, parent);
            }
            else if (json["type"] == "meshrenderer")
            {
                this._parseMeshRenderer(json, box, parent);
            }
            else if (json["type"] == "skinnedmeshrenderer")
            {
                this._parseSkinnedMeshRenderer(json, box, parent);
            }
            else if (json["type"] == "aniplayer")
            {
                this._parseAniPlayer(json, box, parent);
            }
            else
            {
                console.warn("not parse com:" + json["type"]);
                return;
            }
            //console.log("parse com:" + json["type"]);
        }
        DelayParse(): void
        {
            for (var i = 0; i < this.delaycall.length; i++)
            {
                this.delaycall[i]();
            }
            this.delaycall = null;
        }
        _parseTransform(json: {}, box: FreeNode.StreamBox, node: Entity_Empty)
        {

            var sp = (<string>json["transmove"]).split(",");
            var vec3: egret3d.Vector3D = new egret3d.Vector3D(parseFloat(sp[0]), parseFloat(sp[1]), parseFloat(sp[2]));
            node.position = vec3;

            var sp1 = (<string>json["transscale"]).split(",");
            var scale3: egret3d.Vector3D = new egret3d.Vector3D(parseFloat(sp1[0]), parseFloat(sp1[1]), parseFloat(sp1[2]));
            node.scale = scale3;


            var sp2 = (<string>json["transquat"]).split(",");
            var x = parseFloat(sp2[0]);
            var y = parseFloat(sp2[1]);
            var z = parseFloat(sp2[2]);// * -1;
            var w = parseFloat(sp2[3]);// * -1;
            var quat = new egret3d.Quaternion(x, y, z, w);
            var ruler3 = quat.toEulerAngles();
            node.orientation = quat;

            //console.log("name=" + node.name + "vec3=" + vec3.toString() + " scale3=" + scale3.toString() + " ruler3=" + ruler3.toString());

        }
        _parseMeshFilter(json: {}, box: FreeNode.StreamBox, node: Entity_Mesh)
        {
            var geom = <egret3d.SubGeometry>node.geometry;
            var meshname = <string>json["mesh"];
            //var mesh = parent;

            var _data: FreeNode.MeshData = FreeNode.MeshData.loadMesh(box.cacheBin[meshname]);
            
            //var bdata: BABYLON.VertexData =// BABYLON.VertexData.CreateTorus(3, 3, 3);
            //    new BABYLON.VertexData();
            geom.verticesData = [];
            //bdata.positions = [];//填充位置数据
            this.__FillGeomVertex(geom.verticesData, _data, false);

            //bdata.indices = [];//填充索引数据
            geom.indexData = [];
            this.__FillGeomIndex(geom.indexData, _data);

            geom.numItems = geom.indexData.length;

            geom.buildGeomtry();
            geom.buildBoundBox();

            node.box.fillBox(node.geometry.minPos, node.geometry.maxPos);
        }

        //__FillSkeletonFromCurrent(skeleton: egret3d.Skeleton, json: {}): void
        //{
        //    skeleton.numJoint = skeleton.initialSkeleton.numJoint;

        //    var rbname = this.mapNode[json["rootboneobj"]].fullname;
        //    console.log("__bonename:" + rbname);
        //    var bones = <string[]>json["boneobjs"];
        //    for (var i = 0; i < bones.length; i++)
        //    {
        //        console.log("__ssbone:" + this.mapNode[bones[i]].fullname);
        //    }
        //}
        __FillSkinFromTran(json: {}, _data: MeshData, renderobj: egret3d.Object3D): SkinFromTrans
        {
            var tpose: egret3d.Matrix4_4[] = [];
            var bones: egret3d.Object3D[] = [];
            var jsonbones = <string[]>json["boneobjs"];

            for (var i = 0; i < _data.vec10tpose.length / 10; i++)
            {
                var translation = new egret3d.Vector3D(_data.vec10tpose[i * 10 + 0], _data.vec10tpose[i * 10 + 1], _data.vec10tpose[i * 10 + 2]);
                var scale = new egret3d.Vector3D(_data.vec10tpose[i * 10 + 3], _data.vec10tpose[i * 10 + 4], _data.vec10tpose[i * 10 + 5]);
                var orientation = new egret3d.Quaternion(_data.vec10tpose[i * 10 + 6], _data.vec10tpose[i * 10 + 7], _data.vec10tpose[i * 10 + 8], _data.vec10tpose[i * 10 + 9]);

                var mat: egret3d.Matrix4_4 = new egret3d.Matrix4_4();
                mat.makeTransform(translation, scale, orientation);
                tpose.push(mat);
                var node = this.mapNode[jsonbones[i]];
                bones.push(node);
            }
            var skin = new SkinFromTrans(tpose, bones, renderobj);
            //var skeleton = new egret3d.Skeleton();
            //skeleton.joints = [];
            //var joint: egret3d.Joint = new egret3d.Joint("t");
            //joint.inverseBindPose = new egret3d.Matrix4_4();
            //skeleton.joints.push(joint);
            //skeleton.numJoint = skeleton.joints.length;
            //var skin = new egret3d.SkeletonAnimation(skeleton);
            return skin;
        }
        //__FillTPoseSkeleton(skeleton: egret3d.Skeleton, json: {}, _data: MeshData): void
        //{
        //    var rbname = this.mapNode[json["rootboneobj"]].fullname;
        //    console.log("__bonename:" + rbname);
        //    var bones = <string[]>json["boneobjs"];


        //    skeleton.joints = [];
        //    for (var i = 0; i < _data.vec10tpose.length / 10; i++)
        //    {
        //        var node = this.mapNode[bones[i]];
        //        var joint: egret3d.Joint = new egret3d.Joint(node.uuid);

        //        for (var j = 0; j < bones.length; j++)
        //        {
        //            if (bones[j] == node.parent.uuid)
        //            {
        //                joint.parentIndex = j;
        //                joint.parent = node.parent.uuid.toString();
        //                break;
        //            }
        //        }
        //        //joint.
        //        var translation = new egret3d.Vector3D(_data.vec10tpose[i * 10 + 0], _data.vec10tpose[i * 10 + 1], _data.vec10tpose[i * 10 + 2]);
        //        //joint.
        //        var scale = new egret3d.Vector3D(_data.vec10tpose[i * 10 + 3], _data.vec10tpose[i * 10 + 4], _data.vec10tpose[i * 10 + 5]);
        //        //joint.
        //        var orientation = new egret3d.Quaternion(_data.vec10tpose[i * 10 + 6], _data.vec10tpose[i * 10 + 7], _data.vec10tpose[i * 10 + 8], _data.vec10tpose[i * 10 + 9]);

        //        var mat: egret3d.Matrix4_4 = new egret3d.Matrix4_4();
        //        mat.makeTransform(translation, scale, orientation);
        //        joint.inverseBindPose = mat.clone();//  new egret3d.Matrix4_4();

        //        //{//setLocalTransform 对根骨骼没有什么意义，只是测试
        //        //    mat.invert();
        //        //    var vec = mat.decompose(egret3d.Orientation3D.QUATERNION);
        //        //    joint.setLocalTransform(new egret3d.Quaternion(vec[1].x, vec[1].y, vec[1].z, vec[2].w), vec[2], vec[0]);
        //        //}
        //        skeleton.joints.push(joint);
        //    }
        //    skeleton.numJoint = skeleton.joints.length;
        //    //skeleton.reset();

        //}
        __FillGeomVertex(verticesData: number[], _data: MeshData, withskin: boolean): void
        {
            for (var i = 0; i < _data.vec3positions.length / 3; i++)
            {
                var x = _data.vec3positions[i * 3 + 0];
                var y = _data.vec3positions[i * 3 + 1];
                var z = _data.vec3positions[i * 3 + 2];

                //egret3d 计算系统有坑，先乘以2
                verticesData.push(x);
                verticesData.push(y);
                verticesData.push(z);
                if (_data.vec3normals != null)
                {
                    var nx = _data.vec3normals[i * 3 + 0];
                    var ny = _data.vec3normals[i * 3 + 1];
                    var nz = _data.vec3normals[i * 3 + 2];
                    verticesData.push(nx);//normal
                    verticesData.push(ny);
                    verticesData.push(nz);
                }
                else
                {
                    verticesData.push(0);//normal
                    verticesData.push(0);
                    verticesData.push(0);
                }
                if (_data.vec4tangents != null)
                {
                    var nx = _data.vec4tangents[i * 4 + 0];
                    var ny = _data.vec4tangents[i * 4 + 1];
                    var nz = _data.vec4tangents[i * 4 + 2];
                    verticesData.push(nx);//tangent
                    verticesData.push(ny);
                    verticesData.push(nz);
                }
                else
                {
                    verticesData.push(0);//tangent
                    verticesData.push(0);
                    verticesData.push(0);
                }
                if (_data.vec4colors != null)
                {
                    var r = _data.vec4colors[i * 4 + 0];
                    var g = _data.vec4colors[i * 4 + 1];
                    var b = _data.vec4colors[i * 4 + 2];
                    var a = _data.vec4colors[i * 4 + 3];
                    verticesData.push(r);//color
                    verticesData.push(g);
                    verticesData.push(b);
                    verticesData.push(a);
                }
                else
                {
                    verticesData.push(1);//color
                    verticesData.push(1);
                    verticesData.push(1);
                    verticesData.push(1);
                }
                if (_data.vec2uvs0 != null)
                {
                    var uvx = _data.vec2uvs0[i * 2 + 0];
                    var uvy = _data.vec2uvs0[i * 2 + 1];
                    verticesData.push(uvx);//uv0
                    verticesData.push(1 - uvy);
                }
                else
                {
                    verticesData.push(0);//uv0
                    verticesData.push(0);
                }
                if (_data.vec2uvs1 != null)
                {
                    var uvx = _data.vec2uvs1[i * 2 + 0];
                    var uvy = _data.vec2uvs1[i * 2 + 1];
                    verticesData.push(uvx);//uv1
                    verticesData.push(1 - uvy);
                }
                else
                {
                    verticesData.push(0);//uv1
                    verticesData.push(0);
                }
                if (withskin == true)
                {
                    if (_data.vec8widget != null)
                    {
                        //var i0 = _data.vec8widget[i * 8 + 0];
                        //var w0 = _data.vec8widget[i * 8 + 4];
                        //console.warn("bw=" + i0 + "=" + w0);
                        verticesData.push(_data.vec8widget[i * 8 + 0]);//index0;
                        verticesData.push(_data.vec8widget[i * 8 + 1]);//index1
                        verticesData.push(_data.vec8widget[i * 8 + 2]);//index2
                        verticesData.push(_data.vec8widget[i * 8 + 3]);//index3
                        verticesData.push(_data.vec8widget[i * 8 + 4]);//widget0;
                        verticesData.push(_data.vec8widget[i * 8 + 5]);//widget1
                        verticesData.push(_data.vec8widget[i * 8 + 6]);//widget2
                        verticesData.push(_data.vec8widget[i * 8 + 7]);//widget3
                        
                    }
                    else
                    {
                        verticesData.push(0);//index0;
                        verticesData.push(0);//index1
                        verticesData.push(0);//index2
                        verticesData.push(0);//index3
                        verticesData.push(0);//widget0;
                        verticesData.push(0);//widget1
                        verticesData.push(0);//widget2
                        verticesData.push(0);//widget3

                    }
                }
            }

        }
        __FillGeomIndex(indexData: number[], _data: MeshData): void
        {
            for (var i = 0; i < _data.indices[0].indices.length / 3; i++)
            {
                var v0 = _data.indices[0].indices[i * 3 + 0];
                var v1 = _data.indices[0].indices[i * 3 + 1];
                var v2 = _data.indices[0].indices[i * 3 + 2];

                //翻转裁剪信息
                indexData.push(v0);
                indexData.push(v2);
                indexData.push(v1);
            }

        }
        _parseMeshRenderer(json: {}, box: FreeNode.StreamBox, node: Entity_Mesh)
        {
            //console.log("set _parseMeshRenderer");
            node.material = new egret3d.TextureMaterial();
            node.material.lightGroup = this.lightGroup;
            node.material.specularColor = 0xffffff;
            node.material.specularPower = 0.5;
            node.material.ambientColor = 0x111111;

            node.material.shininess = 10.0;

            var matstr: string = json["mats"][0];
            var matjson = JSON.parse(box.cacheTxt[matstr]);
            //var mat = new BABYLON.StandardMaterial("texture1", parent.getScene());

            if (matjson["_Color"] != undefined)
            {
                var sp = (<string>matjson["_Color"]).split(",");
                var r = parseInt(sp[0]) / 255.0;
                var g = parseInt(sp[1]) / 255.0;
                var b = parseInt(sp[2]) / 255.0;
                var a = parseInt(sp[3]) / 255.0;
                var c = new egret3d.Color(r, g, b, a);
                node.material.diffuseColor = c.getColor();
                //    mat.diffuseColor = new BABYLON.Color3(r, g, b);
                //    mat.alpha = a;
            }
            if (matjson["_MainTex"] != undefined)
            {
                var tex = matjson["_MainTex"];
                var texurl = box.cachePic[tex];
                console.log("texurl=" + texurl);

                var textureLoad: egret3d.TextureLoader = new egret3d.TextureLoader(texurl);
                textureLoad.addEventListener(egret3d.Event3D.EVENT_LOAD_COMPLETE,
                    (e: egret3d.Event3D) =>
                    {
                        node.material.diffuseTexture = textureLoad.texture;
                    }
                );
                textureLoad.load();

                //var tloadr = new egret3d.TextureLoader(texurl);
                
                //    //
                //    mat.diffuseTexture = new BABYLON.Texture(box.baseUrl + "/" + matjson["mainTexture"], parent.getScene());

            }
            //parent.material = mat;
        }
        _parseSkinnedMeshRenderer(json: {}, box: FreeNode.StreamBox, node: Entity_Mesh)
        {
            node.rotation = new egret3d.Vector3D(0, 0, 0);
            //console.log("set _parseSkinnedMeshRenderer");
            node.geometry = new egret3d.SkinGeometry();
            var geom = <egret3d.SkinGeometry>node.geometry;
            var meshname = <string>json["mesh"];
            //var mesh = parent;

            var _data: FreeNode.MeshData = FreeNode.MeshData.loadMesh(box.cacheBin[meshname]);
            
            //var bdata: BABYLON.VertexData =// BABYLON.VertexData.CreateTorus(3, 3, 3);
            //    new BABYLON.VertexData();
            var verticesData: number[] = [];
            //bdata.positions = [];//填充位置数据
            this.__FillGeomVertex(verticesData, _data, true);

            //bdata.indices = [];//填充索引数据
            var indexData: number[] = [];
            this.__FillGeomIndex(indexData, _data);


            geom.setGeomtryData(indexData, verticesData, null);
            this.delaycall.push(
                () =>
                {
                    //因为这里需要访问其他的node，需要delay，等nodetree创建出来之后再执行
                    var skin = this.__FillSkinFromTran(json, _data, node);
                    skin.updateSkeletonMatrixData();
                    node.animation = skin; //这个animation实际承担的是skin的作用
                }
            );
            geom.buildGeomtry();
            geom.buildBoundBox();
            node.box.fillBox(node.geometry.minPos, node.geometry.maxPos);

            //end mesh

            node.material = new egret3d.TextureMaterial();
            node.material.lightGroup = this.lightGroup;
            node.material.specularColor = 0xffffff;
            node.material.specularPower = 0.5;
            node.material.ambientColor = 0x111111;

            node.material.shininess = 10.0;

            var matstr: string = json["mats"][0];
            var matjson = JSON.parse(box.cacheTxt[matstr]);
            //var mat = new BABYLON.StandardMaterial("texture1", parent.getScene());

            if (matjson["_Color"] != undefined)
            {
                var sp = (<string>matjson["_Color"]).split(",");
                var r = parseInt(sp[0]) / 255.0;
                var g = parseInt(sp[1]) / 255.0;
                var b = parseInt(sp[2]) / 255.0;
                var a = parseInt(sp[3]) / 255.0;
                var c = new egret3d.Color(r, g, b, a);
                node.material.diffuseColor = c.getColor();
                //    mat.diffuseColor = new BABYLON.Color3(r, g, b);
                //    mat.alpha = a;
            }
            if (matjson["_MainTex"] != undefined)
            {
                var tex = matjson["_MainTex"];
                var texurl = box.cachePic[tex];
                console.log("texurl=" + texurl);

                var textureLoad: egret3d.TextureLoader = new egret3d.TextureLoader(texurl);
                textureLoad.addEventListener(egret3d.Event3D.EVENT_LOAD_COMPLETE,
                    (e: egret3d.Event3D) =>
                    {
                        node.material.diffuseTexture = textureLoad.texture;
                    }
                );
                textureLoad.load();

                //var tloadr = new egret3d.TextureLoader(texurl);
                
                //    //
                //    mat.diffuseTexture = new BABYLON.Texture(box.baseUrl + "/" + matjson["mainTexture"], parent.getScene());

            }
            //parent.material = mat;
        }
        _parseAniPlayer(json: {}, box: FreeNode.StreamBox, node: Entity_Empty): void
        {
            var aplayer = new AniPlayer();
            node.animation = aplayer;
            var anis: { [id: string]: FreeNode.AniClipData } = {};
            for (var i = 0; i < (<[]>json["clips"]).length; i++)
            {
                var clipfilename = json["clips"][i];
                var clip = AniClipData.loadClip(box.cacheBin[clipfilename]);
                aplayer.clips[clip.name] = clip;
            }

            this.delaycall.push(() =>
            {
                //delay fillbone name
                for (var j in this.mapNode)
                {
                    aplayer.boneuuid[this.mapNode[j].fullname] = j;
                }
                for (var c in aplayer.clips)
                {
                    var clip = aplayer.clips[c];
                    for (var a in clip.boneinfo)
                    {
                        var bonename = clip.boneinfo[a];
                        var uuid: number = aplayer.boneuuid[node.fullname + "/" + bonename];
                        aplayer.boneobj[bonename] = this.mapNode[uuid]
                    }
                }
                //自动播放第零个骨骼动画
                if (aplayer.getAnimList().length > 0)
                {
                    aplayer.play(aplayer.getAnimList()[0]);
                }
            }
            );
            //node.comps.push(anis);

        }
    }
}