# Copyright (c) 2024 The InvokeAI Development team
"""LoRA model support."""

from pathlib import Path
from typing import Dict, Optional, Union

import torch
from safetensors.torch import load_file
from typing_extensions import Self

from invokeai.backend.model_manager import BaseModelType
from invokeai.backend.peft.conversions.sdxl_lora_conversion_utils import convert_sdxl_keys_to_diffusers_format
from invokeai.backend.peft.layers.any_lora_layer import AnyLoRALayer
from invokeai.backend.peft.layers.full_layer import FullLayer
from invokeai.backend.peft.layers.ia3_layer import IA3Layer
from invokeai.backend.peft.layers.loha_layer import LoHALayer
from invokeai.backend.peft.layers.lokr_layer import LoKRLayer
from invokeai.backend.peft.layers.lora_layer import LoRALayer
from invokeai.backend.peft.layers.norm_layer import NormLayer
from invokeai.backend.raw_model import RawModel


class LoRAModelRaw(RawModel):  # (torch.nn.Module):
    _name: str
    layers: Dict[str, AnyLoRALayer]

    def __init__(
        self,
        name: str,
        layers: Dict[str, AnyLoRALayer],
    ):
        self._name = name
        self.layers = layers

    @property
    def name(self) -> str:
        return self._name

    def to(self, device: Optional[torch.device] = None, dtype: Optional[torch.dtype] = None) -> None:
        # TODO: try revert if exception?
        for _key, layer in self.layers.items():
            layer.to(device=device, dtype=dtype)

    def calc_size(self) -> int:
        model_size = 0
        for _, layer in self.layers.items():
            model_size += layer.calc_size()
        return model_size

    @classmethod
    def from_checkpoint(
        cls,
        file_path: Union[str, Path],
        device: Optional[torch.device] = None,
        dtype: Optional[torch.dtype] = None,
        base_model: Optional[BaseModelType] = None,
    ) -> Self:
        device = device or torch.device("cpu")
        dtype = dtype or torch.float32

        if isinstance(file_path, str):
            file_path = Path(file_path)

        model = cls(
            name=file_path.stem,
            layers={},
        )

        if file_path.suffix == ".safetensors":
            sd = load_file(file_path.absolute().as_posix(), device="cpu")
        else:
            sd = torch.load(file_path, map_location="cpu")

        state_dict = cls._group_state(sd)

        if base_model == BaseModelType.StableDiffusionXL:
            state_dict = convert_sdxl_keys_to_diffusers_format(state_dict)

        for layer_key, values in state_dict.items():
            # Detect layers according to LyCORIS detection logic(`weight_list_det`)
            # https://github.com/KohakuBlueleaf/LyCORIS/tree/8ad8000efb79e2b879054da8c9356e6143591bad/lycoris/modules

            # lora and locon
            if "lora_up.weight" in values:
                layer: AnyLoRALayer = LoRALayer(layer_key, values)

            # loha
            elif "hada_w1_a" in values:
                layer = LoHALayer(layer_key, values)

            # lokr
            elif "lokr_w1" in values or "lokr_w1_a" in values:
                layer = LoKRLayer(layer_key, values)

            # diff
            elif "diff" in values:
                layer = FullLayer(layer_key, values)

            # ia3
            elif "on_input" in values:
                layer = IA3Layer(layer_key, values)

            # norms
            elif "w_norm" in values:
                layer = NormLayer(layer_key, values)

            else:
                print(f">> Encountered unknown lora layer module in {model.name}: {layer_key} - {list(values.keys())}")
                raise Exception("Unknown lora format!")

            # lower memory consumption by removing already parsed layer values
            state_dict[layer_key].clear()

            layer.to(device=device, dtype=dtype)
            model.layers[layer_key] = layer

        return model

    @staticmethod
    def _group_state(state_dict: Dict[str, torch.Tensor]) -> Dict[str, Dict[str, torch.Tensor]]:
        state_dict_groupped: Dict[str, Dict[str, torch.Tensor]] = {}

        for key, value in state_dict.items():
            stem, leaf = key.split(".", 1)
            if stem not in state_dict_groupped:
                state_dict_groupped[stem] = {}
            state_dict_groupped[stem][leaf] = value

        return state_dict_groupped